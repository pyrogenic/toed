# frozen_string_literal: true

require 'pathname'
require 'pp'
require 'set'

# Parse OD-API Model Files
class ParseModel
  def titlecase(name)
    name[0].upcase + name[1, name.length]
  end

  def canon_name(name)
    name.split(/(?=[ _])/).map(&method(:titlecase)).join
  end

  attr_accessor :open_class, :open_list_type, :interfaces, :types, :type_names, :renames, :aliases

  def initialize
    self.open_class = nil
    self.open_list_type = nil
    self.interfaces = Hash.new { |h, k| h[k] = [] }
    self.types = Set.new
    self.type_names = Hash.new { |h, k| h[k] = Set.new }
    self.renames = {}
    self.aliases = {}
  end

  def exec
    Pathname(ARGV.shift || 'words.odmodel').readlines.each do |line|
      line.gsub!(/^\s+|\s+$/, '')
      if open_class
        if /^}$/ =~ line
          self.open_class = nil
        elsif /^
            (?<name>\w+)
            [ ]\(
                (?<type>[^,]*)
                (?:,\s*(?:(?<optional>optional)|(?<p2>[^,]*)))*
            \)
            (?::\s*(?<comment>.*?))?
            ,?$/x =~ line
          optional = !optional.nil?
          pp(p2: p2) if p2 && !p2.empty?
          data = { name: name, optional: optional, type: type }
          data[:comment] = comment if comment && !comment.empty?
          types << type
          type_names[type] << name
          interfaces[open_class] << data
        else
          puts("XX: #{line}")
        end
      elsif open_list_type
        case line
        when /^\]$/
          self.open_list_type = nil
        when 'string'
          aliases[open_list_type] = 'string'
        when /\w/
          cn = canon_name(line)
          pp(line: line, cn: cn, open_list_type: open_list_type)
          aliases[canon_name(line)] = open_list_type
        else
          puts("XX: #{line}")
        end
      elsif /^(?<class_name>.+?)\s*\{$/ =~ line
        self.open_class = class_name
      elsif /^(?<class_name>.+?)\s*\[$/ =~ line
        self.open_list_type = class_name
      else
        puts("XX: #{line}")
      end
    end
  end

  def inspect
    pp(types: types.to_a.sort, type_names: type_names.map { |k, v| [k, v.to_a.sort] }.to_h, renames: renames, aliases: aliases)
  end

  def proper_name(name, declaration: false, as_class: false)
    verbose = false
    result = renames[name] ||= begin
      og_name = name
      if /_/ =~ name
        type_names.each do |key, names|
          next unless key.split(name).length > 1

          name = key.sub(name, names.uniq.first)
          pp(og_name: og_name, key: key, name: name)
          verbose = true
          break
        end
      end
      name = canon_name(name)
      name = aliases[name] || name
      if name != og_name
        proper_name(name)
      elsif /^(array\[(?<base>.*?)s?\]|arrayof(?<base>.*?)?|(?<base>.*)array|(?<base>.*?)(?<add_y>ies)?s?list)$/i =~ name
        base += y if add_y
        base = proper_name(base)
        "#{base}[]"
      elsif /^(?<primitive>string|object|number)s?$/i =~ name
        primitive.downcase
      elsif /^(I[a-z]|[^I])/ =~ name
        'I' + name
      else
        name
      end
    end
    result = result.sub(/^I([A-Z])/, '\1') if as_class
    pp(result: result) if verbose
    return result unless declaration

    result.split('[').first
  end

  def gen_interfaces
    interfaces.map do |declaring_interface_name, props|
      declaring_interface_name = proper_name(declaring_interface_name, declaration: true)
      lines = []
      lines << "export default interface #{declaring_interface_name} {"
      props.each do |name:, optional:, type:, comment: nil|
        type = proper_name(type)
        is_interface = /^I[^a-z]/ =~ type
        dep_name = proper_name(type, declaration: true)
        dep_map[declaring_interface_name] << dep_name if is_interface && dep_name != declaring_interface_name
        lines << "    /** #{comment} */" if comment
        lines << "    #{name}#{optional ? '?' : ''}: #{type};"
        lines << nil
      end
      lines << '}'
      lines << nil
      [declaring_interface_name, lines]
    end
  end

  def dep_map
    @dep_map ||= Hash.new { |h, k| h[k] = Set.new }
  end

  def ser_map
    @ser_map ||= Hash.new { |h, k| h[k] = Set.new }
  end

  def gen_classes
    interfaces.map do |declaring_type_name, props|
      declaring_type_name = proper_name(declaring_type_name, declaration: true, as_class: true)
      lines = ["export default class #{declaring_type_name} {"]
      props.each do |name:, optional:, type:, comment: nil|
        interface_type = proper_name(type)
        type = proper_name(type, as_class: true)
        is_class = interface_type != type
        is_interface = /^I[^a-z]/ =~ interface_type
        type, is_array = type.split('[')
        unless optional
          default = if is_array
                      ' = []'
                    elsif is_class
                      " = new #{type}()"
                    end
        end
        dep_map[declaring_type_name] << type if is_class && declaring_type_name != type
        dep_map[declaring_type_name] << proper_name(interface_type, declaration: true) if is_interface
        serializable = is_class ? "object(#{type})" : 'primitive()'
        ser_map[declaring_type_name] << (is_class ? 'object' : 'primitive')
        if is_array
          serializable = "list(#{serializable})"
          ser_map[declaring_type_name] << 'list'
        end
        if optional
          serializable = "optional(#{serializable})"
          ser_map[declaring_type_name] << 'optional'
        end
        optional = if optional
                     '?'
                   elsif default
                     ''
                   else
                     '!'
                   end
        lines << "    /** #{comment} */" if comment
        lines << "    @serializable(#{serializable})"
        lines << "    #{name}#{optional}: #{interface_type}#{default};"
        lines << nil
      end
      lines << '}'
      lines << nil
      [declaring_type_name, lines]
    end
    # circular_dep_sentinel = Set.new
    # depends_on = lambda do |a, b|
    #   puts((' ' * circular_dep_sentinel.length) + "depends_on(#{a}, #{b})?")
    #   raise circular_dep_sentinel.to_a.join(' > ') unless circular_dep_sentinel.add?(a)

    #   begin
    #     if dep_map[a].member?(b)
    #       puts((' ' * circular_dep_sentinel.length) + "#{a} depends on #{b}")
    #       true
    #     else
    #       why = dep_map[a].detect { |bb| depends_on.call(bb, b) }
    #       puts((' ' * circular_dep_sentinel.length) + "#{a} depends on #{b} because of #{why}") if why
    #       why
    #     end
    #   ensure
    #     circular_dep_sentinel.delete(a)
    #   end
    # end
    # remaining_types = declarations.map { |e, _| e }
    # next_type = declarations.detect do |type, _|
    #   (remaining_types - [type]).none? do |other_type|
    #     depends_on.call(type, other_type)
    #   end
    # end
    # raise unless next_type
    # declarations.delete(next_type)
  end

  def export
    declarations = gen_interfaces + gen_classes
    declarations.each do |type, lines|
      File.open("gen/#{type}.ts", 'w') do |file|
        unless ser_map[type].empty?
          ser_deps = ['serializable'] + ser_map[type].to_a
          pp(type: type, ser_deps: ser_deps)
          ser_deps = ser_deps.sort
          file.puts("import {#{ser_deps.join(', ')}} from \"serializr\";")
        end
        dep_map[type].to_a.sort.each do |dep|
          file.puts("import #{dep} from \"./#{dep}\";")
        end
        file.puts
        lines.each(&file.method(:puts))
      end
    end
  end
end

p = ParseModel.new
p.exec
p.export

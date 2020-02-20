-- e.g. 'dictionary:happy:marks'
--                        marks <-- mark set parent
--                  happy       <-- item member
local item_set = KEYS[1];
-- e.g. 'marks:marks:heart'
--                  heart       <-- mark
--            marks             <-- mark set parent
local mark_set = KEYS[2];
-- e.g. 'happy', only for validation or to avoid string ops
local item = ARGV[1];
-- e.g. 'heart', only for validation or to avoid string ops
local mark = ARGV[2];

if not item_set then error('missing item_set (key 1)') end
if not mark_set then error('missing mark_set (key 2)') end
if not item then error('missing item (arg 1)') end
if not mark then error('missing mark (arg 2)') end

local item_verify;
local mark_set_parent;
item_verify, mark_set_parent = string.match(item_set, ":([^:]+):([^:]+)$");
if not item_verify or not mark_set_parent then error('item_set key must be of the form ...:<item>:<marks>') end

local mark_verify;
local mark_set_parent_verify;
mark_set_parent_verify, mark_verify = string.match(mark_set, ":([^:]+):([^:]+)$");
if not mark_set_parent_verify or not mark_verify then error('mark_set key must be of the form ...:<marks>:<mark>') end

if item_verify ~= item then
    error(string.format("to add %s to %s, %s must end in %s:%s",
        mark, item, item_set, item, mark_set_parent));
end

if mark_set_parent ~= mark_set_parent_verify or mark ~= mark_verify then
    error(string.format("to add %s to %s, %s must end in %s:%s",
        mark, item_set, mark_set, mark_set_parent, mark));
end

local r1 = redis.call("SADD", item_set, mark);
local r2 = redis.call("SADD", mark_set, item);

return { r1, r2 };

-- include("$BS.preamble.lua")

local r1 = redis.call("SADD", item_set, mark);
local r2 = redis.call("SADD", mark_set, item);

return { r1, r2 };

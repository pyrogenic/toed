-- include("$BS.preamble.lua")

local r1 = redis.call("SREM", item_set, mark);
local r2 = redis.call("SREM", mark_set, item);

return { r1, r2 };

"use strict";
var import_querys = require("./querys");
var import_main = require("../main");
const getTableSizes = async () => {
  const tables = await (0, import_querys.getAllTables)();
  const tableSizes = [];
  await Promise.all(
    tables.map(async (table) => {
      tableSizes.push(await (0, import_querys.getTableSize)(import_main.dbConfig.database, table));
    })
  );
  console.log(JSON.stringify(tableSizes));
};
//# sourceMappingURL=tableSize.js.map

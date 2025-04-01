"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var lib_exports = {};
__export(lib_exports, {
  addParamsToTableItem: () => addParamsToTableItem,
  calculateAverage: () => calculateAverage,
  differenceResult: () => differenceResult,
  sumResult: () => sumResult
});
module.exports = __toCommonJS(lib_exports);
function calculateAverage(rows) {
  let sum = 0;
  rows.forEach((row) => {
    sum += row.val;
  });
  return sum / rows.length;
}
function sumResult(rows) {
  return rows.reduce((acc, row) => {
    return acc + row.val;
  }, 0);
}
function differenceResult(rows) {
  const firstRow = rows[0];
  const lastRow = rows[rows.length - 1];
  if (!(firstRow == null ? void 0 : firstRow.val) || !(lastRow == null ? void 0 : lastRow.val)) {
    return 0;
  }
  return lastRow.val - firstRow.val;
}
const addParamsToTableItem = (table) => {
  const tableWithMoreParams = table;
  return tableWithMoreParams.map((item) => {
    return { ...item, oldTimestamp: 0 };
  });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  addParamsToTableItem,
  calculateAverage,
  differenceResult,
  sumResult
});
//# sourceMappingURL=lib.js.map

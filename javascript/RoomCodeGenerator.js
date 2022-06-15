"use strict";
exports.__esModule = true;
var RoomCodeGenerator = /** @class */ (function () {
    function RoomCodeGenerator(initialGuidCount) {
        if (initialGuidCount === void 0) { initialGuidCount = 1000; }
        this.allCodes = [];
        this.freeIDs = [];
        for (var index = 0; index < initialGuidCount; index++) {
            this.release(this.generateGuid());
        }
    }
    RoomCodeGenerator.prototype.getNext = function () {
        var _a;
        if (this.freeIDs.length > 0) {
            return (_a = this.freeIDs.shift()) !== null && _a !== void 0 ? _a : this.generateGuid();
        }
        return this.generateGuid();
    };
    RoomCodeGenerator.prototype.release = function (guid) {
        this.freeIDs.push(guid);
    };
    RoomCodeGenerator.prototype.generateGuid = function () {
        var randomChar = function () { return String.fromCharCode(Math.floor(Math.random() * 26) + 65); };
        var randomDigit = function () { return Math.floor(Math.random() * 10); };
        var generateCode = function () { return "".concat(randomChar()).concat(randomDigit()).concat(randomDigit()).concat(randomChar()); };
        var code = generateCode();
        while (this.allCodes.includes(code)) {
            code = generateCode();
        }
        this.allCodes.push(code);
        return code;
    };
    ;
    return RoomCodeGenerator;
}());
exports["default"] = RoomCodeGenerator;

type roomCode = string;

class RoomCodeGenerator {
  allCodes: roomCode[];
  freeIDs: roomCode[];
  constructor(initialGuidCount: number = 1000) {
    this.allCodes = [];
    this.freeIDs = [];
    for (let index = 0; index < initialGuidCount; index++) {
      this.release(this.generateGuid());
    }
  }

  getNext(): roomCode {
    if (this.freeIDs.length > 0) {
      return this.freeIDs.shift() ?? this.generateGuid();
    }
    return this.generateGuid();
  }

  release(guid: roomCode) {
    this.freeIDs.push(guid);
  }

  private generateGuid(): roomCode {
    const randomChar = (): string => String.fromCharCode(Math.floor(Math.random() * 26) + 65);
    const randomDigit = (): number => Math.floor(Math.random() * 10);
    const generateCode = (): string => `${randomChar()}${randomDigit()}${randomDigit()}${randomChar()}`
    let code = generateCode();
    while (this.allCodes.includes(code)) {
      code = generateCode();
    }
    this.allCodes.push(code);
    return code;
  };
}

export default RoomCodeGenerator;

const REG = {
    $0: 0,
    $1: 1,
    $2: 2,
    $3: 3,
    $4: 4,
    $5: 5,
    $6: 6,
    $7: 7,
    $zero: 0,
    $t0: 1,
    $t1: 2,
    $t2: 3,
    $a0: 4,
    $a1: 5,
    $v0: 6,
    $ra: 7
};

const SUPINS = {
    // add $rd, $rs, $rt
    'add': { type: 'R', opcode: 0, funct: 0x07 },
    'addu': { type: 'R', opcode: 1, funct: 0x00 },
    'and': { type: 'R', opcode: 1, funct: 0x03 },
    'nor': { type: 'R', opcode: 2, funct: 0x01 },
    'or': { type: 'R', opcode: 1, funct: 0x04 },
    'slt': { type: 'R', opcode: 2, funct: 0x02 },
    'sub': { type: 'R', opcode: 1, funct: 0x01 },
    'subu': { type: 'R', opcode: 1, funct: 0x02 },
    'mul': { type: 'R', opcode: 2, funct: 0x03 },
    // addi $rt, $rs, IM
    'addi': { type: 'I', opcode: 0x07 },
    'addiu': { type: 'I', opcode: 0x08 },
    'andi': { type: 'I', opcode: 0xb },
    'ori': { type: 'I', opcode: 0xc },
    'slti': { type: 'I', opcode: 0x09 },
    'sltiu': { type: 'I', opcode: 0xa },
    // beq $rs, $rt, LABEL
    'beq': { type: 'I', opcode: 0x05 },
    'bne': { type: 'I', opcode: 0x06 },
    // j LABEL
    'j': { type: 'J', opcode: 0x03 },
    'jal': { type: 'J', opcode: 0x04 },
    // jr $rs
    'jr': { type: 'R', opcode: 0, funct: 0x04 },
    // lw $rt, IM($rs)
    'lw': { type: 'I', opcode: 0xe },
    'sw': { type: 'I', opcode: 0xf },
    // sll $rd, $rt, SH
    'sll': { type: 'R', opcode: 0, funct: 0x01 },
    'srl': { type: 'R', opcode: 0, funct: 0x02 },
    'sra': { type: 'R', opcode: 0, funct: 0x03 },
    // mfhi $rd
    'mfhi': { type: 'R', opcode: 0, funct: 0x05 },
    'mflo': { type: 'R', opcode: 0, funct: 0x06 },
    // div $rs, $rt
    'div': { type: 'R', opcode: 1, funct: 0x07 },
    'divu': { type: 'R', opcode: 2, funct: 0x00 },
    'mult': { type: 'R', opcode: 1, funct: 0x05 },
    'multu': { type: 'R', opcode: 1, funct: 0x06 },
    // lui $rt, IM
    'lui': { type: 'I', opcode: 0xd },
    // pseudo
    'nop': { type: 'R', opcode: 0, funct: 0x00 },
};

const max_memory = 0x700000; // should be more but decreased for optimization

class MIPS_Memory {

    constructor() {
        // Initialize memory
        this.memory = new Uint8Array(max_memory + 1);
    }


    clear_memory() {
        this.memory = new Uint8Array(max_memory + 1);
    }

    /**
     * Read a byte from memory.
     * @param {number} address - The memory address to read from.
     * @returns {number} The byte read from memory.
     */
    read_byte(address) {
        if (address < 0 || address > max_memory) {
            console.error("Address out of bounds");
        }
        return this.memory[address];
    }

    /**
    * Write a byte to memory.
    * @param {number} address - The memory address to write to.
    * @param {number} value - The value to write to memory.
    */
    write_byte(address, value) {
        if (address < 0 || address > max_memory) {
            console.error("Address out of bounds");
        }
        this.memory[address] = value;
    }

    /**
     * Read a word (4 bytes) from memory.
     * @param {number} address - The memory address to read from.
     * @returns {number | undefined} The word read from memory.
     */
    read_word(address) {
        if (address < 0 || address > (max_memory - 2)) {
            console.error("Address out of bounds");
            return undefined;
        }
        let word = 0;
        for (let i = 0; i < 2; i++) {
            word |= this.memory[address + i] << (i * 8);
        }
        return (word >>> 0) & 0xFFFF;
    }

    /**
     * Write a word (4 bytes) to memory.
     * @param {number} address - The memory address to write to.
     * @param {number} value - The value to write to memory.
     */
    write_word(address, value) {
        if (address < 0 || address > (max_memory - 2)) {
            console.error("Address out of bounds");
            return;
        }
        for (let i = 0; i < 2; i++) {
            this.memory[address + i] = (value >> (i * 8)) & 0xFF;
        }
    }
}

const PC_START = 0x00;
const Memory = new MIPS_Memory();
let Registers = new Uint8Array(8);
let PC = PC_START; // Program Counter
let HI = 0;
let LO = 0;

let is_error = false;
let last_pc = 0;


window.onload = function () {
    document.getElementById("breset").onclick = breset_click
    document.getElementById("bstep").onclick = bstep_click
    document.getElementById("ball").onclick = ball_click
    document.getElementById("text-area").oninput = textarea_change
    document.getElementById('fromlines').oninput = load_data_memory
    document.getElementById('tolines').oninput = load_data_memory
    write_linenums()
    load_registers()
}

function breset_click() {
    const text_area = document.getElementById("text-area")
    const bstep = document.getElementById("bstep")
    const ball = document.getElementById("ball")
    Memory.clear_memory()
    Registers = new Uint8Array(8);

    PC = PC_START;
    HI = 0;
    LO = 0;
    textarea_change()
    load_registers()
    text_area.contentEditable = true
    bstep.disabled = false
    ball.disabled = false
    const pastline = document.querySelector('.cur')
    if (pastline)
        pastline.classList.remove('cur');
}

function bstep_click() {
    run_interpreter(1)
}

function ball_click() {
    run_interpreter(1000)
}

function load_registers() {
    const mreg = document.getElementById("main-registers")
    mreg.innerHTML = "<div class='head'><div>Name</div><div>Number</div><div>Value</div></div>";
    for (const reg in REG) {
        if (reg.match(/\$\d+/))
            continue;
        mreg.innerHTML += `<div class='ops'><div>${reg}</div><div>${REG[reg]}</div><div>0x${(Registers[REG[reg]] >>> 0).toString(16)}</div></div>`;
    }
    const PC_el = document.getElementById("PC")
    const HI_el = document.getElementById("HI")
    const LO_el = document.getElementById("LO")
    PC_el.children[1].textContent = "0x" + PC.toString(16).padStart(2, '0')
    HI_el.children[1].textContent = HI
    LO_el.children[1].textContent = LO
    load_data_memory()
}

function load_data_memory() {
    const data_mem = document.getElementById("data-mem")
    data_mem.innerHTML = "<div class='head'><div>Address</div><div>Hex</div></div>";
    const fromlines = document.getElementById('fromlines')
    const tolines = document.getElementById('tolines')
    let start = parseInt(fromlines.value);
    let upto = parseInt(tolines.value)
    if (isNaN(start)) {
        start = 0xFF;
        fromlines.value = `0x${0xFF.toString(16)}`;
    }
    if (isNaN(upto) && tolines.value !== "") {
        upto = 100;
        tolines.value = 100;
    }
    if (tolines.value === "")
        upto = 100;
    if (upto < 0) {
        for (let i = start; i > start + (upto * 2); i -= 2) {
            let word = Memory.read_word(i)
            if (word === undefined)
                continue;
            data_mem.innerHTML += `<div class='ops'><div id='d${i}'>0x${i.toString(16).padStart(2, '0')}</div><div>0x${word.toString(16).padStart(4, '0')}</div></div>`
        }
        return
    }
    for (let i = start; i < start + (upto * 2); i += 2) {
        let word = Memory.read_word(i)
        if (word === undefined)
            continue;
        data_mem.innerHTML += `<div class='ops'><div id='d${i}'>0x${i.toString(16).padStart(2, '0')}</div><div>0x${word.toString(16).padStart(4, '0')}</div></div>`
    }
}


function show_error(err) {
    const el = document.getElementById("error")
    const bstep = document.getElementById("bstep")
    const ball = document.getElementById("ball")
    if (err === "No Errors" || err === "Program Finished") {
        el.textContent = err
        el.classList.remove("ered")
        is_error = false
        bstep.disabled = false
        ball.disabled = false
        return
    }
    el.textContent = err
    el.classList.add("ered")
    bstep.disabled = true
    ball.disabled = true
    is_error = true
}

function write_linenums() {
    const line_nums = document.getElementById("line-nums")
    for (let i = 1; i <= 50; i++)
        line_nums.innerHTML += `<div id='ln${i}'>${i}</div>`;
}


function textarea_change() {
    const text_area = document.getElementById("text-area")
    const input = parse_inner_html(text_area.childNodes).newValue
    const instruction_mem = document.getElementById("instruction-mem")
    let new_instructions = "<div class='head'><div>Address</div><div>Hex</div><div>Decimal</div></div>";
    show_error("No Errors")
    if (input === "") {
        instruction_mem.innerHTML = new_instructions;
        return
    }
    let lines = input.split('\n').map(x => x.trim()).map(x => x.replace(/#.+/, ''));
    // gather all labels
    const Labels = {}
    let label_line_index = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const mc = line.match(/.+:/)
        if (line === "")
            label_line_index--;
        if (mc) {
            const label = mc[0].replace(':', '').trim();
            const rest = lines[i].slice(mc[0].length).trim()
            Labels[label] = label_line_index
            if (rest === "")
                label_line_index--;
            lines[i] = rest
        }
        label_line_index++
    }
    // convert to machine code
    let line_index = 0;
    for (let rawi = 0; rawi < lines.length; rawi++) {
        const line = lines[rawi];
        let ins = "";
        let len_first = 0;
        if (line === "") {
            continue
        }
        ins_loop: for (const char of line) {
            len_first++;
            if (char.match(/\s/g)) // instruction
                break ins_loop;
            if (!char.match(/\s/g))
                ins += char;
        }

        if (!(ins in SUPINS)) {
            show_error(`L${rawi + 1}: unsupported instruction ${ins}`)
            return
        }
        const rest_line = line.slice(len_first).trim()
        const delim_line = rest_line.split(',').map(x => x.trim())
        let result = 0;
        const info = SUPINS[ins];
        switch (ins) {
            case "add":
            case "addu":
            case "and":
            case "nor":
            case "or":
            case "slt":
            case "sub":
            case "subu":
            case "mul": {
                if (delim_line.length !== 3) {
                    show_error(`L${rawi + 1}: ${ins} needs 3 values`)
                    return
                }

                const rd = REG[delim_line[0]]
                const rs = REG[delim_line[1]]
                const rt = REG[delim_line[2]]
                if (rd === undefined || rs === undefined || rt === undefined) {
                    show_error(`L${rawi + 1}: invalid value(s) ${rd ? '' : 'rd '}${rs ? '' : 'rs '}${rt ? '' : 'rt'}`)
                    return
                }
                result = (info.opcode << 12) | (rs << 9) | (rt << 6) | (rd << 3) | info.funct;
                break;
            }
            case "addi":
            case "addiu":
            case "slti":
            case "sltiu": {
                if (delim_line.length !== 3) {
                    show_error(`L${rawi + 1}: ${ins} needs 3 values`)
                    return
                }
                const rs = REG[delim_line[1]]
                const rt = REG[delim_line[0]]
                const im = parseInt(delim_line[2])
                if (rs === undefined || rt === undefined) {
                    show_error(`L${rawi + 1}: invalid value(s) ${rs ? '' : 'rs '}${rt ? '' : 'rt'}`)
                    return
                }
                if (isNaN(im) || im === undefined) {
                    show_error(`L${rawi + 1}: invalid immediate value ${delim_line[2]}`)
                    return
                }
                if (im < -32 || im > 31) {  // 6 bit range
                    show_error(`L${rawi + 1}: immediate value is out of range ${delim_line[2]}`)
                    return
                }
                result = (info.opcode << 12) | (rs << 9) | (rt << 6) | (im & 0x3F);
                break;
            }
            case "andi":
            case "ori": {
                if (delim_line.length !== 3) {
                    show_error(`L${rawi + 1}: ${ins} needs 3 values`)
                    return
                }
                const rs = REG[delim_line[1]]
                const rt = REG[delim_line[0]]
                const im = parseInt(delim_line[2])
                if (rs === undefined || rt === undefined) {
                    show_error(`L${rawi + 1}: invalid value(s) ${rs ? '' : 'rs '}${rt ? '' : 'rt'}`)
                    return
                }
                if (isNaN(im) || im === undefined) {
                    show_error(`L${rawi + 1}: invalid immediate value ${delim_line[2]}`)
                    return
                }
                if (im < 0 || im > 63) {  // 6 bit range
                    show_error(`L${rawi + 1}: immediate value is out of range ${delim_line[2]}`)
                    return
                }
                result = (info.opcode << 12) | (rs << 9) | (rt << 6) | (im & 0x3F);
                break;
            }
            case "beq":
            case "bne": {
                if (delim_line.length !== 3) {
                    show_error(`L${rawi + 1}: ${ins} needs 3 values`)
                    return
                }
                const rs = REG[delim_line[0]]
                const rt = REG[delim_line[1]]
                const lbl = delim_line[2]
                const lbl_add = Labels[lbl]
                if (rs === undefined || rt === undefined) {
                    show_error(`L${rawi + 1}: invalid value(s) ${rs ? '' : 'rs '}${rt ? '' : 'rt'}`)
                    return
                }
                if (lbl_add === undefined) {
                    show_error(`L${rawi + 1}: ${lbl} no such label`)
                    return
                }
                let mvam = lbl_add - line_index - 1 // amount to move
                mvam = mvam & 0x3F // mask to 6 bits
                result = (info.opcode << 12) | (rs << 9) | (rt << 6) | mvam;
                break;
            }
            case "j":
            case "jal": {
                if (delim_line.length !== 1) {
                    show_error(`L${rawi + 1}: ${ins} needs a label value`)
                    return
                }
                const lbl = delim_line[0]
                let lbl_add = Labels[lbl]
                if (lbl_add === undefined) {
                    show_error(`L${rawi + 1}: ${lbl} no such label`)
                    return
                }
                lbl_add = (lbl_add + (PC >>> 2)) & 0xFFF  // mask to 12 bits
                result = (info.opcode << 12) | lbl_add;
                // Return back later
                break;
            }
            case "jr": {
                if (delim_line.length !== 1) {
                    show_error(`L${rawi + 1}: ${ins} needs a single value`)
                    return
                }
                const rs = REG[delim_line[0]]
                if (rs === undefined) {
                    show_error(`L${rawi + 1}: invalid register`)
                    return
                }
                result = (info.opcode << 12) | (rs << 9) | info.funct;
                break;
            }
            case "mfhi":
            case "mflo": {
                if (delim_line.length !== 1) {
                    show_error(`L${rawi + 1}: ${ins} needs a single value`)
                    return
                }
                const rd = REG[delim_line[0]]
                if (rd === undefined) {
                    show_error(`L${rawi + 1}: invalid register`)
                    return
                }
                result = (info.opcode << 12) | (rd << 3) | info.funct;
                break;
            }
            case "div":
            case "divu":
            case "mult":
            case "multu": {
                if (delim_line.length !== 2) {
                    show_error(`L${rawi + 1}: ${ins} needs 2 values`)
                    return
                }
                const rs = REG[delim_line[0]]
                const rt = REG[delim_line[1]]
                if (rs === undefined || rt === undefined) {
                    show_error(`L${rawi + 1}: invalid value(s) ${rs ? '' : 'rs '}${rt ? '' : 'rt'}`)
                    return
                }
                result = (info.opcode << 12) | (rs << 9) | (rt << 6) | info.funct;
                break;
            }
            case "lw":
            case "sw": {
                if (delim_line.length !== 2) {
                    show_error(`L${rawi + 1}: ${ins} needs 2 values`)
                    return
                }
                const rt = REG[delim_line[0]]
                const rs_im = delim_line[1]
                const rs_imsplit = rs_im.replace(')', '').split('(').map(x => x.trim())
                const im = parseInt(rs_imsplit[0])
                const rs = REG[rs_imsplit[1]]
                if (rs === undefined || rt === undefined) {
                    show_error(`L${rawi + 1}: invalid value(s) ${rs ? '' : 'rs '}${rt ? '' : 'rt'}`)
                    return
                }
                if (isNaN(im) || im === undefined) {
                    show_error(`L${rawi + 1}: invalid immediate value ${rs_imsplit[0]}`)
                    return
                }
                if (im < -32 || im > 31) {  // 6 bit range
                    show_error(`L${rawi + 1}: immediate value is out of range ${rs_imsplit[0]}`)
                    return
                }
                result = (info.opcode << 12) | (rs << 9) | (rt << 6) | (im & 0x3F);
                break;
            }
            case "lui": {
                if (delim_line.length !== 2) {
                    show_error(`L${rawi + 1}: ${ins} needs 2 values`)
                    return
                }
                const rt = REG[delim_line[0]]
                const im = parseInt(delim_line[1])
                if (rt === undefined) {
                    show_error(`L${rawi + 1}: invalid register`)
                    return
                }
                if (isNaN(im) || im === undefined) {
                    show_error(`L${rawi + 1}: invalid immediate value ${delim_line[1]}`)
                    return
                }
                if (im < 0 || im > 63) {  // 6 bit range
                    show_error(`L${rawi + 1}: immediate value is out of range ${delim_line[1]}`)
                    return
                }
                result = (info.opcode << 12) | (rt << 6) | (im & 0x3F);
                break;
            }
            case "sll":
            case "srl":
            case "sra": {
                if (delim_line.length !== 3) {
                    show_error(`L${rawi + 1}: ${ins} needs 3 values`)
                    return
                }
                const rd = REG[delim_line[0]]
                const rt = REG[delim_line[1]]
                const sh = parseInt(delim_line[2]) // shamt
                if (rd === undefined || rt === undefined) {
                    show_error(`L${rawi + 1}: invalid value(s) ${rd ? '' : 'rd '}${rt ? '' : 'rt'}`)
                    return
                }
                if (isNaN(sh) || sh === undefined) {
                    show_error(`L${rawi + 1}: invalid shamt value ${delim_line[2]}`)
                    return
                }
                if (sh > 0b111 || sh < 0) {
                    show_error(`L${rawi + 1}: shamt is out of range`)
                    return
                }
                result = (info.opcode << 12) | (sh << 9) | (rt << 6) | (rd << 3) | info.funct;
                console.log(result.toString(2).padStart(16, '0'))
                break;
            }
            case "nop": {
                if (delim_line.length !== 1 || delim_line[0] !== "") {
                    show_error(`L${rawi + 1}: ${ins} needs 0 values`)
                    return
                }
                result = (info.opcode << 12) | (REG.$0 << 9) | (REG.$0 << 6) | info.funct;
                break;
            }
            default: {
                show_error(`L${rawi + 1}: ${ins} not implemented`)
                return;
            }
        }
        result = result >>> 0; // get rid off sign!
        Memory.write_word((line_index * 2) + PC, result)
        last_pc = (line_index * 2) + PC;
        let binary_rep = result.toString(2).padStart(16, '0');
        function strbits2decimal(value) {
            return parseInt(value, 2).toString()
        }
        switch (info.type) {
            case 'R':
                binary_rep = strbits2decimal(binary_rep.slice(0, 4)) + '-' +
                    strbits2decimal(binary_rep.slice(4, 7)) + '-' +
                    strbits2decimal(binary_rep.slice(7, 10)) + '-' +
                    strbits2decimal(binary_rep.slice(10, 13)) + '-' +
                    strbits2decimal(binary_rep.slice(13, 16));
                break;
            case 'J':
                binary_rep = strbits2decimal(binary_rep.slice(0, 4)) + '-' +
                    strbits2decimal(binary_rep.slice(4, 16));
                break;
            case 'I':
                binary_rep = strbits2decimal(binary_rep.slice(0, 4)) + '-' +
                    strbits2decimal(binary_rep.slice(4, 7)) + '-' +
                    strbits2decimal(binary_rep.slice(7, 10)) + '-' +
                    strbits2decimal(binary_rep.slice(10, 16));
                break;
            default:
                break;
        }
        new_instructions += `<div class="ops">
                                <div>0x${((line_index * 2) + PC).toString(16).padStart(2, '0')}</div>
                                <div>0x${result.toString(16).padStart(4, '0')}</div>
                                <div>${binary_rep}</div>
                            </div>`;
        line_index++;
    }


    instruction_mem.innerHTML = new_instructions;
}

function parse_sigint(binaryString, bitSize) {
    // Parse the binary string to an integer
    let value = parseInt(binaryString, 2);

    // If the most significant bit is set
    if (value & (1 << (bitSize - 1))) {
        // Convert from two's complement
        value = value - Math.pow(2, bitSize);
    }

    return value;
}

let program_finished = false;
function PC2LN() {
    const text_area = document.getElementById("text-area")
    const input = parse_inner_html(text_area.childNodes).newValue
    let lines = input.split('\n').map(x => x.replace(/#.+/, '')).map(x => x.replace(/.+:/, '')).map(x => x.trim());
    let code_index = ((PC % PC_START) / 2) + 1;
    let visual_index = 0;
    for (let line of lines) {
        if (code_index <= 0)
            break;
        visual_index++;
        if (line === "")
            continue;
        code_index--;
    }
    return visual_index
}

function run_interpreter(times) {
    document.getElementById("text-area").contentEditable = false
    program_finished = false
    for (let i = 0; i < times; i++) {
        if (PC > last_pc) {
            show_error("Program Finished")
            bstep.disabled = true
            ball.disabled = true
            program_finished = true
            break;
        }

        const pastline = document.querySelector('.cur')
        if (pastline)
            pastline.classList.remove('cur');
        const lineel = document.getElementById(`ln${PC2LN()}`)
        lineel.classList.add('cur')

        run_code(PC);
        PC += 2;
        load_registers();
    }

}

function run_code(lPC) {
    const ins_line = Memory.read_word(lPC);
    const opcode = ins_line >>> 12;
    const ins_str = ins_line.toString(2).padStart(16, '0')
    if (opcode === 0 || opcode === 1 || opcode === 2) { // R type
        const rs = parseInt(ins_str.slice(4, 7), 2)
        const rt = parseInt(ins_str.slice(7, 10), 2)
        const rd = parseInt(ins_str.slice(10, 13), 2)
        const sh = rs
        const funct = parseInt(ins_str.slice(13, 16), 2)
        if (opcode === 0) {
            switch (funct) {
                case 0: { // nop
                    break;
                }
                case 1: { // sll
                    Registers[rd] = Registers[rt] << sh
                    break;
                }
                case 2: { // srl
                    Registers[rd] = Registers[rt] >>> sh
                    break;
                }
                case 3: { // sra
                    Registers[rd] = Registers[rt] >> sh
                    break;
                }
                case 4: { //jr
                    PC = Registers[rs] - 2 // subtracted because PC+=2
                    break;
                }
                case 5: { // mfhi
                    Registers[rd] = HI
                    break;
                }
                case 6: { // mflo
                    Registers[rd] = LO
                    break;
                }
                case 7:   // add
                    {
                        Registers[rd] = Registers[rs] + Registers[rt]
                        break;
                    }
            }
        }
        if (opcode === 1) {
            switch (funct) {
                case 0: { // addu
                    Registers[rd] = Registers[rs] + Registers[rt]
                    break;
                }
                case 1:   // sub
                case 2: { // subu
                    Registers[rd] = Registers[rs] - Registers[rt]
                    break;
                }
                case 3: { // and
                    Registers[rd] = Registers[rs] & Registers[rt]
                    break;
                }
                case 4: { // or
                    Registers[rd] = Registers[rs] | Registers[rt]
                    break;
                }
                case 5:   // mult
                case 6: { // multu
                    let rs_b = BigInt(Registers[rs])
                    let rt_b = BigInt(Registers[rt])
                    let result = BigInt(rs_b) * BigInt(rt_b);

                    LO = Number(result & BigInt("0xFF"))
                    HI = Number((result >> BigInt(8)) & BigInt("0xFF"))
                    break;
                }
                case 7:   // div
                    {
                        LO = Registers[rs] / Registers[rt]
                        HI = Registers[rs] % Registers[rt]
                        break;
                    }
                default: {
                    console.error(`R type funct not implemented ${funct}`)
                    break;
                }
            }
        }
        if (opcode === 2) {
            switch (funct) {
                case 0: { // divu
                    LO = Registers[rs] / Registers[rt]
                    HI = Registers[rs] % Registers[rt]
                    break;
                }
                case 1: { // nor
                    Registers[rd] = ~(Registers[rs] | Registers[rt]) >>> 0
                    break;
                }
                case 2: { // slt
                    Registers[rd] = Registers[rs] < Registers[rt]
                    break;
                }
                case 3: { // mul
                    Registers[rd] = Registers[rs] * Registers[rt];
                    break;
                }
                default: {
                    console.error(`R type funct not implemented ${funct}`)
                    break;
                }
            }
        }

    } else if (opcode === 3 || opcode === 4) { // J type
        const address = parseInt(ins_str.slice(4, 16), 2)
        if (opcode === 3) { // j
            PC = (address * 2) - 2 // address << 2
        } else if (opcode === 4) { // jal
            Registers[REG.$ra] = PC + 2
            PC = (address * 2) - 2 // address << 2
        }
    } else if (opcode > 4 && opcode < 16) { // I type
        const rs = parseInt(ins_str.slice(4, 7), 2)
        const rt = parseInt(ins_str.slice(7, 10), 2)

        switch (opcode) {
            case 5: { // beq
                const imm = parse_sigint(ins_str.slice(10), 6) // Sign extended
                if (Registers[rs] === Registers[rt])
                    PC += (imm * 2);
                break;
            }
            case 6: { // bne
                const imm = parse_sigint(ins_str.slice(10), 6) // Sign extended
                if (Registers[rs] !== Registers[rt])
                    PC += (imm * 2);
                break;
            }
            case 7:   // addi
            case 8: { // addiu
                const imm = parse_sigint(ins_str.slice(10), 6) // Sign extended
                Registers[rt] = Registers[rs] + imm
                break;
            }
            case 9:   // slti
            case 10: { // sltiu
                const imm = parse_sigint(ins_str.slice(10), 6) // Sign extended
                Registers[rt] = (Registers[rs] < imm) ? 1 : 0
                break;
            }
            case 11: { // andi
                const imm = parseInt(ins_str.slice(10), 2) // Zero extended
                Registers[rt] = Registers[rs] & imm
                break;
            }
            case 12: { // ori
                const imm = parseInt(ins_str.slice(10), 2) // Zero extended
                Registers[rt] = Registers[rs] | imm
                break;
            }
            case 13: { // lui
                const imm = parseInt(ins_str.slice(10), 2) // Zero extended
                Registers[rt] = (imm << 4);
                break;
            }
            case 14: { // lw
                const imm = parse_sigint(ins_str.slice(10), 6) // Sign extended
                Registers[rt] = Memory.read_word(Registers[rs] + imm)
                break;
            }
            case 15: { // sw
                const imm = parse_sigint(ins_str.slice(10), 6) // Sign extended
                Memory.write_word(Registers[rs] + imm, Registers[rt])
                break;
            }
            default: {
                console.error(`I type opcode not implemented ${opcode}`)
                break;
            }
        }
    } else {
        console.error("Bad opcode!") // TODO: add more info
    }
}

function parse_inner_html(childNodes, newValue = '', isOnFreshLine = true) {
    for (let i = 0; i < childNodes.length; i++) {
        const childNode = childNodes[i];

        if (childNode.nodeName === 'BR') {
            // BRs are always line breaks which means the next loop is on a fresh line
            newValue += '\n';
            isOnFreshLine = true;
            continue;
        }

        // We may or may not need to create a new line
        if (childNode.nodeName === 'DIV' && isOnFreshLine === false) {
            // Divs create new lines for themselves if they aren't already on one
            newValue += '\n';
        }

        // Whether we created a new line or not, we'll use it for this content so the next loop will not be on a fresh line:
        isOnFreshLine = false;

        // Add the text content if this is a text node:
        if (childNode.nodeType === 3 && childNode.textContent) {
            newValue += childNode.textContent;
        }

        // If this node has children, get into them as well:
        const rec = parse_inner_html(childNode.childNodes, newValue, isOnFreshLine)
        newValue = rec.newValue;
        isOnFreshLine = rec.isOnFreshLine;
    }
    return { newValue: newValue, isOnFreshLine: isOnFreshLine }
}



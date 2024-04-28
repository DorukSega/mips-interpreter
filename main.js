
window.onload = function () {
    document.getElementById("breset").onclick = breset_click
    document.getElementById("bstep").onclick = bstep_click
    document.getElementById("ball").onclick = ball_click
    document.getElementById("text-area").oninput = textarea_change 
    write_linenums() 
    load_registers()
}

function breset_click() {
    const text_area =  document.getElementById("text-area")
    const bstep = document.getElementById("bstep")
    const ball = document.getElementById("ball")
    Memory.clear_memory()
    Registers = new Int32Array(32);
    Registers[REG.$sp] = 0x7fffeffc;
    Registers[REG.$gp] = 0x10008000;

    PC = 0x00400000;
    HI = 0
    LO = 0
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

function load_registers(){
    const mreg = document.getElementById("main-registers")
    mreg.innerHTML = "<div class='head'><div>Name</div><div>Number</div><div>Value</div></div>";
    for(const reg in REG){
        if (reg === '$0')
            continue;
        mreg.innerHTML += `<div class='ops'><div>${reg}</div><div>${REG[reg]}</div><div>0x${(Registers[REG[reg]]>>>0).toString(16)}</div></div>`;
    }
    const PC_el = document.getElementById("PC")
    const HI_el = document.getElementById("HI")
    const LO_el = document.getElementById("LO")
    PC_el.children[1].textContent = "0x"+ PC.toString(16).padStart(8,'0')
    HI_el.children[1].textContent = HI
    LO_el.children[1].textContent = LO
    const data_mem = document.getElementById("data-mem")
    data_mem.innerHTML = "<div class='head'><div>Address</div><div>Hex</div></div>";
    for(let i = 0x10010000; i < 0x10010100; i+=4){
        data_mem.innerHTML += `<div class='ops'><div>0x${i.toString(16).padStart(8,'0')}</div><div>0x${Memory.read_word(i).toString(16).padStart(8,'0')}</div></div>`
    }
}

function show_error(err) {
    const el = document.getElementById("error")
    const bstep = document.getElementById("bstep")
    const ball = document.getElementById("ball")
    if (err === undefined) {
        el.textContent = "No Errors"
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
    for (let i = 1; i <= 30; i++)
        line_nums.innerHTML += `<div id='ln${i}'>${i}</div>`;
}

const REG = {
    $0: 0, // zero register
    $zero: 0,
    $at: 1, 
    $v0: 2, // procedure return
    $v1: 3,
    $a0: 4, // arguments
    $a1: 5,
    $a2: 6,
    $a3: 7,
    $t0: 8, // temporaries
    $t1: 9,
    $t2: 10,
    $t3: 11,
    $t4: 12,
    $t5: 13,
    $t6: 14,
    $t7: 15,
    $s0: 16, // saved
    $s1: 17,
    $s2: 18,
    $s3: 19,
    $s4: 20,
    $s5: 21,
    $s6: 22,
    $s7: 23,
    $t8: 24, 
    $t9: 25,
    $k0: 26,
    $k1: 27,
    $gp: 28,
    $sp: 29, // stack pointer
    $fp: 30, // frame pointer
    $ra: 31  // return adress
};

const SUPINS = {
    // add $rd, $rs, $rt
    'add'   : { type: 'R', opcode: 0,  funct: 0x20 },
    'addu'  : { type: 'R', opcode: 0,  funct: 0x21 },
    'and'   : { type: 'R', opcode: 0,  funct: 0x24 },
    'nor'   : { type: 'R', opcode: 0,  funct: 0x27 },
    'or'    : { type: 'R', opcode: 0,  funct: 0x25 },
    'slt'   : { type: 'R', opcode: 0,  funct: 0x2a },
    'sub'   : { type: 'R', opcode: 0,  funct: 0x22 },
    'subu'  : { type: 'R', opcode: 0,  funct: 0x32 },
    'mul'   : { type: 'R', opcode: 28, funct: 0x2 },
    // addi $rt, $rs, IM
    'addi'  : { type: 'I', opcode: 0x8  },
    'addiu' : { type: 'I', opcode: 0x9  },
    'andi'  : { type: 'I', opcode: 0xc  },
    'ori'   : { type: 'I', opcode: 0xd  },
    'slti'  : { type: 'I', opcode: 0xa  },
    'sltiu' : { type: 'I', opcode: 0xb  },
    // beq $rs, $rt, LABEL
    'beq'   : { type: 'I', opcode: 0x4  },
    'bne'   : { type: 'I', opcode: 0x5  },
    // j LABEL
    'j'     : { type: 'J', opcode: 0x2  },
    'jal'   : { type: 'J', opcode: 0x3  },
    // jr $rs
    'jr'    : { type: 'R', opcode: 0,  funct: 0x08 },
    // lw $rt, IM($rs)
    'lw'    : { type: 'I', opcode: 0x23 },
    'sw'    : { type: 'I', opcode: 0x2b },
    // sll $rd, $rt, SH
    'sll'   : { type: 'R', opcode: 0,  funct: 0x00 },
    'srl'   : { type: 'R', opcode: 0,  funct: 0x02 },
    'sra'   : { type: 'R', opcode: 0,  funct: 0x3  },
    // mfhi $rd
    'mfhi'  : { type: 'R', opcode: 0,  funct: 0x10 },
    'mflo'  : { type: 'R', opcode: 0,  funct: 0x12 },
    // div $rs, $rt
    'div'   : { type: 'R', opcode: 0,  funct: 0x1a },
    'divu'  : { type: 'R', opcode: 0,  funct: 0x1b },
    'mult'  : { type: 'R', opcode: 0,  funct: 0x18 },
    'multu' : { type: 'R', opcode: 0,  funct: 0x19 },
    // lui $rt, IM
    'lui'   : { type: 'I', opcode: 0xf  },
};

class MIPS_Memory {
    constructor() {
        // Initialize memory
        this.memory = new Uint8Array(0xFFFFFFFF + 1);
    }

    clear_memory(){
        this.memory = new Uint8Array(0xFFFFFFFF + 1);
    }

    /**
     * Read a byte from memory.
     * @param {number} address - The memory address to read from.
     * @returns {number} The byte read from memory.
     */
    read_byte(address) {
        if (address < 0 || address > 0xFFFFFFFF) {
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
        if (address < 0 || address > 0xFFFFFFFF) {
            console.error("Address out of bounds");
        }
        this.memory[address] = value;
    }

    /**
     * Read a word (4 bytes) from memory.
     * @param {number} address - The memory address to read from.
     * @returns {number} The word read from memory.
     */
    read_word(address) {
        if (address < 0 || address > 0xFFFFFFFC) {
            console.error("Address out of bounds");
        }
        let word = 0;
        for (let i = 0; i < 4; i++) {
            word |= this.memory[address + i] << (i * 8);
        }
        return (word >>> 0);
    }

    /**
     * Write a word (4 bytes) to memory.
     * @param {number} address - The memory address to write to.
     * @param {number} value - The value to write to memory.
     */
    write_word(address, value) {
        if (address < 0 || address > 0xFFFFFFFC) {
            console.error("Address out of bounds");
        }
        for (let i = 0; i < 4; i++) {
            this.memory[address + i] = (value >> (i * 8)) & 0xFF;
        }
    }
}

const Memory = new MIPS_Memory();
let Registers = new Int32Array(32);
Registers[REG.$sp] = 0x7fffeffc;
Registers[REG.$gp] = 0x10008000;
let PC = 0x00400000; // Program Counter 
let HI = 0;
let LO = 0;
let is_error = false;

function textarea_change() {
    const text_area =  document.getElementById("text-area")
    const input = text_area.innerText
    const instruction_mem = document.getElementById("instruction-mem")
    let new_instructions = "<div class='head'><div>Address</div><div>Hex</div><div>Decimal</div></div>";
    show_error()
    if (input === ""){
        instruction_mem.innerHTML = new_instructions;
        return
    }
    let lines = input.split('\n').filter(x=> x!=="").map(x=> x.trim()).map(x=> x.replace(/#.+/,''));

    // gather all labels
    const Labels = {}
    let label_i = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const mc =  line.match(/.+:/g)
        if (mc){
            const label = mc[0].replace(':','').trim();
            const rest = lines[i].slice(mc[0].length).trim()
            Labels[label] = label_i 
            lines[i] = rest
        } else label_i++;
    }
    // convert to machine code
    lines = lines.filter(x=> x!=="") // remove empty lines
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let ins = "";
        let len_first = 0;
        ins_loop: for (const char of line) {
            len_first++;
            if (char.match(/\s/g)) // instruction
                break ins_loop;
            if (!char.match(/\s/g))
                ins += char;
        }

        if (!(ins in SUPINS)){
            show_error(`L${i+1}: unsupported instruction ${ins}`)
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
                if (delim_line.length !== 3){
                    show_error(`L${i+1}: ${ins} needs 3 values`)
                    return 
                } 
               
                const rd = REG[delim_line[0]]
                const rs = REG[delim_line[1]]
                const rt = REG[delim_line[2]]
                if (rd === undefined || rs === undefined || rt === undefined){
                    show_error(`L${i+1}: invalid value(s) ${rd?'':'rd '}${rs?'':'rs '}${rt?'':'rt'}`)
                    return 
                }
                result = (info.opcode << 26) | (rs << 21) | (rt << 16) | (rd << 11) | info.funct;
                break;
            }
            case "addi":
            case "addiu": 
            case "slti":
            case "sltiu": {
                if (delim_line.length !== 3){
                    show_error(`L${i+1}: ${ins} needs 3 values`)
                    return 
                } 
                const rs = REG[delim_line[1]]
                const rt = REG[delim_line[0]] 
                const im = parseInt(delim_line[2]) 
                if (rs === undefined || rt === undefined){
                    show_error(`L${i+1}: invalid value(s) ${rs?'':'rs '}${rt?'':'rt'}`)
                    return 
                }
                if (isNaN(im) || im === undefined){
                    show_error(`L${i+1}: invalid immediate value ${delim_line[2]}`)
                    return
                }
                if ( im < -32768 || im > 32767) {  // 16 bit range
                    show_error(`L${i+1}: immediate value is out of range ${delim_line[2]}`)
                    return
                }
                result = (info.opcode << 26) | (rs << 21) | (rt << 16) | (im & 0xFFFF);
                break;
            }
            case "andi":
            case "ori": {
                if (delim_line.length !== 3){
                    show_error(`L${i+1}: ${ins} needs 3 values`)
                    return 
                } 
                const rs = REG[delim_line[1]]
                const rt = REG[delim_line[0]] 
                const im = parseInt(delim_line[2]) 
                if (rs === undefined || rt === undefined){
                    show_error(`L${i+1}: invalid value(s) ${rs?'':'rs '}${rt?'':'rt'}`)
                    return 
                }
                if (isNaN(im) || im === undefined){
                    show_error(`L${i+1}: invalid immediate value ${delim_line[2]}`)
                    return
                }
                if ( im < 0 || im > 65535) {  // 16 bit range
                    show_error(`L${i+1}: immediate value is out of range ${delim_line[2]}`)
                    return
                }
                result = (info.opcode << 26) | (rs << 21) | (rt << 16) | (im & 0xFFFF);
                break;
            }
            case "beq":
            case "bne": {
                if (delim_line.length !== 3){
                    show_error(`L${i+1}: ${ins} needs 3 values`)
                    return 
                } 
                const rs = REG[delim_line[0]]
                const rt = REG[delim_line[1]] 
                const lbl = delim_line[2] 
                const lbl_add = Labels[lbl]
                if (rs === undefined || rt === undefined){
                    show_error(`L${i+1}: invalid value(s) ${rs?'':'rs '}${rt?'':'rt'}`)
                    return 
                }
                if (lbl_add === undefined) {
                    show_error(`L${i+1}: ${lbl} no such label`)
                    return 
                }
                let mvam = lbl_add - i - 1 // amount to move
                mvam = mvam & 0xFFFF // mask to 16 bits
                result = (info.opcode << 26) | (rs << 21) | (rt << 16) | mvam;
                break;
            }
            case "j": 
            case "jal": {
                if (delim_line.length !== 1){
                    show_error(`L${i+1}: ${ins} needs a label value`)
                    return 
                } 
                const lbl = delim_line[0] 
                let lbl_add = Labels[lbl] 
                if (lbl_add === undefined) {
                    show_error(`L${i+1}: ${lbl} no such label`)
                    return 
                }
                lbl_add = (lbl_add + (PC >>> 2)) & 0x3FFFFFF  // mask to 26 bits
                result = (info.opcode << 26) | lbl_add;
                break;
            }
            case "jr": {
                if (delim_line.length !== 1){
                    show_error(`L${i+1}: ${ins} needs a single value`)
                    return 
                } 
                const rs = REG[delim_line[0]]
                if (rs === undefined) {
                    show_error(`L${i+1}: invalid register`)
                    return 
                }
                result = (info.opcode << 26) | (rs << 21) | info.funct;
                break;
            }
            case "mfhi": 
            case "mflo": {
                if (delim_line.length !== 1){
                    show_error(`L${i+1}: ${ins} needs a single value`)
                    return 
                } 
                const rd = REG[delim_line[0]]
                if (rd === undefined) {
                    show_error(`L${i+1}: invalid register`)
                    return 
                }
                result = (info.opcode << 26) | (rd << 11) | info.funct;
                break;
            }
            case "div":
            case "divu":
            case "mult": 
            case "multu": {
                if (delim_line.length !== 2){
                    show_error(`L${i+1}: ${ins} needs 2 values`)
                    return 
                } 
                const rs = REG[delim_line[0]]
                const rt = REG[delim_line[1]]
                if (rs === undefined || rt === undefined){
                    show_error(`L${i+1}: invalid value(s) ${rs?'':'rs '}${rt?'':'rt'}`)
                    return 
                }
                result = (info.opcode << 26) | (rs << 21) | (rt << 16) | info.funct;
                break;
            }
            case "lw": 
            case "sw": {
                if (delim_line.length !== 2){
                    show_error(`L${i+1}: ${ins} needs 2 values`)
                    return 
                } 
                const rt = REG[delim_line[0]]
                const rs_im = delim_line[1]
                const rs_imsplit = rs_im.replace(')','').split('(').map(x => x.trim())
                const im = parseInt(rs_imsplit[0]) 
                const rs = REG[rs_imsplit[1]]
                if (rs === undefined || rt === undefined){
                    show_error(`L${i+1}: invalid value(s) ${rs?'':'rs '}${rt?'':'rt'}`)
                    return 
                }
                if (isNaN(im) || im === undefined){
                    show_error(`L${i+1}: invalid immediate value ${rs_imsplit[0]}`)
                    return
                }
                if ( im < -32768 || im > 32767) {  // 16 bit range
                    show_error(`L${i+1}: immediate value is out of range ${rs_imsplit[0]}`)
                    return
                }
                result = (info.opcode << 26) | (rs << 21) | (rt << 16) | (im & 0xFFFF);
                break;
            }
            case "lui": {
                if (delim_line.length !== 2){
                    show_error(`L${i+1}: ${ins} needs 2 values`)
                    return 
                } 
                const rt = REG[delim_line[0]]
                const im = parseInt(delim_line[1]) 
                if (rt === undefined){
                    show_error(`L${i+1}: invalid register`)
                    return 
                }
                if (isNaN(im) || im === undefined){
                    show_error(`L${i+1}: invalid immediate value ${delim_line[1]}`)
                    return
                }
                if ( im < 0 || im > 65535) {  // 16 bit range
                    show_error(`L${i+1}: immediate value is out of range ${delim_line[1]}`)
                    return
                }
                result = (info.opcode << 26) | (rt << 16) | (im & 0xFFFF);
                break;
            }
            case "sll":
            case "srl":
            case "sra": {
                if (delim_line.length !== 3){
                    show_error(`L${i+1}: ${ins} needs 3 values`)
                    return 
                } 
                const rd = REG[delim_line[0]]
                const rt = REG[delim_line[1]]
                const sh = parseInt(delim_line[2]) // shamt
                if (rd === undefined || rt === undefined){
                    show_error(`L${i+1}: invalid value(s) ${rd?'':'rd '}${rt?'':'rt'}`)
                    return 
                }
                if (isNaN(sh) || sh === undefined){
                    show_error(`L${i+1}: invalid shamt value ${delim_line[2]}`)
                    return
                }
                if (sh > 0b11111 || sh < 0){
                    show_error(`L${i+1}: shamt is out of range`)
                    return 
                }
                result = (info.opcode << 26) | (rt << 16) | (rd << 11) | (sh << 6) | info.funct;
                break;
            }
            default:{
                show_error(`L${i+1}: ${ins} not implemented`)
                return;
            }
        }
        result = result >>> 0; // get rid off sign!
        Memory.write_word((i*4)+PC, result)

        let binary_rep = result.toString(2).padStart(32,'0');
        function strbits2decimal(value){
            return parseInt(value,2).toString()
        }     
        switch (info.type) {
            case 'R':
                binary_rep = strbits2decimal(binary_rep.slice(0,6))  +'-'+ 
                             strbits2decimal(binary_rep.slice(6,11)) +'-'+ 
                             strbits2decimal(binary_rep.slice(11,16))+'-'+ 
                             strbits2decimal(binary_rep.slice(16,21))+'-'+ 
                             strbits2decimal(binary_rep.slice(21,26))+'-'+ 
                             strbits2decimal(binary_rep.slice(26,32));
                break;
            case 'J':
                binary_rep = strbits2decimal(binary_rep.slice(0,6))  +'-'+ 
                             strbits2decimal(binary_rep.slice(6,32));
                break;
            case 'I':
                binary_rep = strbits2decimal(binary_rep.slice(0,6))  +'-'+ 
                             strbits2decimal(binary_rep.slice(6,11)) +'-'+ 
                             strbits2decimal(binary_rep.slice(11,16))+'-'+ 
                             strbits2decimal(binary_rep.slice(16,32));
                break;
            default:
                break;
        }
        new_instructions += `<div class="ops">
                                <div>0x${((i*4)+PC).toString(16).padStart(8,'0')}</div>
                                <div>0x${result.toString(16).padStart(8,'0')}</div>
                                <div>${binary_rep}</div>
                            </div>`;
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
function run_interpreter(times) {
    document.getElementById("text-area").contentEditable = false
    program_finished = false
    for (let i = 0; i < times; i++) {
        if (program_finished)
            break;
        const pastline = document.querySelector('.cur')
            if (pastline)
                pastline.classList.remove('cur'); 
        const lineel = document.getElementById(`ln${((PC % 0x00400000) / 4) + 1}`)
        lineel.classList.add('cur')

        run_code(PC);
        PC += 4; 
        load_registers();
    }
    
}

function run_code(lPC){
    const ins_line = Memory.read_word(lPC);
    if (ins_line === 0){
        console.log("Program finished")
        // TODO: add a popup and reset?
        bstep.disabled = true
        ball.disabled = true
        program_finished = true
        return
    } 
    const opcode = ins_line >>> 26;
    const ins_str = ins_line.toString(2).padStart(32, '0') 
    if (opcode === 0 || opcode === 28) { // R type
        const rs     = parseInt(ins_str.slice(6, 11) , 2)
        const rt     = parseInt(ins_str.slice(11,16) , 2)
        const rd     = parseInt(ins_str.slice(16, 21) , 2)
        const sh     = parseInt(ins_str.slice(21, 26) , 2)
        const funct  = parseInt(ins_str.slice(26, 32) , 2)
        if (opcode === 28 && funct === 2) { // mul
            Registers[rd] = Registers[rs] * Registers[rt];
            return
        }
        switch (funct) {
            case 0: { // sll
                Registers[rd] =  Registers[rt] << sh
                break;
            }
            case 2: { // srl
                console.log(sh)
                Registers[rd] =  Registers[rt] >>> sh
                break;
            }
            case 3: { // sra
                Registers[rd] =  Registers[rt] >> sh
                break;
            }
            case 8: { //jr
                PC = Registers[rs] - 4 // subtracted because PC+=4
                break;
            }
            case 16: { // mfhi
                Registers[rd] = HI
                break;
            }   
            case 18: { // mflo
                Registers[rd] = LO
                break;
            }  
            case 32:   // add
            case 33: { // addu
                Registers[rd] = Registers[rs] + Registers[rt]
                break;
            }
            case 34:   // sub
            case 35: { // subu
                Registers[rd] = Registers[rs] - Registers[rt]
                break;
            }
            case 36: { // and
                Registers[rd] = Registers[rs] & Registers[rt]
                break;
            }
            case 37: { // or
                Registers[rd] = Registers[rs] | Registers[rt]
                break;
            }
            case 24:   // mult
            case 25: { // multu
                let rs_b = BigInt(Registers[rs])
                let rt_b = BigInt(Registers[rt])
                let result = BigInt(rs_b) * BigInt(rt_b);

                LO = Number(result & BigInt("0xFFFFFFFF"))
                HI = Number((result >> BigInt(32)) & BigInt("0xFFFFFFFF"))
                break;
            }   
            case 26:   // div
            case 27: { // divu
                LO = Registers[rs] / Registers[rt]
                HI = Registers[rs] % Registers[rt]
                break;
            }   
            case 39: { // nor
                Registers[rd] = ~(Registers[rs] | Registers[rt]) >>> 0
                break;
            }
            case 42: { // slt
                Registers[rd] = Registers[rs] < Registers[rt]
                break;
            }
        
            default:
                break;
        }
    } else if (opcode === 2 || opcode === 3){ // J type
        const address = parseInt(ins_str.slice(6, 32) , 2)
        if (opcode === 2){ // j
            PC = (address * 4) - 4 // address << 2
        } else if (opcode === 3){ // jal
            Registers[REG.$ra] = PC + 4
            PC = (address * 4) - 4 // address << 2
        }
    } else if (opcode > 3 && opcode < 44){ // I type
        const rs  = parseInt(ins_str.slice(6, 11) , 2)
        const rt  = parseInt(ins_str.slice(11,16) , 2)
        
        switch (opcode) {
            case 4: { // beq
                const imm = parse_sigint(ins_str.slice(16), 16) // Sign extended
                if (Registers[rs] === Registers[rt])
                    PC += (imm*4);
                break;
            }
            case 5: { // bne
                const imm = parse_sigint(ins_str.slice(16), 16) // Sign extended
                if (Registers[rs] !== Registers[rt])
                    PC += (imm*4);
                break;
            }
            case 8:   // addi
            case 9: { // addiu
                const imm = parse_sigint(ins_str.slice(16), 16) // Sign extended
                Registers[rt] = Registers[rs] + imm
                break;
            }
            case 10:   // slti
            case 11: { // sltiu
                const imm = parse_sigint(ins_str.slice(16), 16) // Sign extended
                Registers[rt] = (Registers[rs] < imm) ? 1 : 0
                break;
            }
            case 12: { // andi
                const imm = parseInt(ins_str.slice(16), 2) // Zero extended
                Registers[rt] = Registers[rs] & imm
                break;
            }
            case 13: { // ori
                const imm = parseInt(ins_str.slice(16), 2) // Zero extended
                Registers[rt] = Registers[rs] | imm
                break;
            }
            case 15: { // lui
                const imm = parseInt(ins_str.slice(16), 2) // Zero extended
                Registers[rt] = imm << 16
                break;
            }
            case 35: { // lw
                const imm = parse_sigint(ins_str.slice(16), 16) // Sign extended
                Registers[rt] = Memory.read_word(Registers[rs] + imm)
                break;
            }
            case 43: { // sw
                const imm = parse_sigint(ins_str.slice(16), 16) // Sign extended
                Memory.write_word(Registers[rs] + imm, Registers[rt])  
                break;
            }
            default: {
                console.error(`I type opcode not implemented ${opcode}`)
                break;
            }
        }
    } else{
        console.error("Bad opcode!") // TODO: add more info
    }
}
import fs from 'fs'
import path from 'path'
import luainjs from '../dist/lua-in-js.cjs.js'

let exitCode = 0

{
    const rootPath = './tests/starlight/'
    const luaEnv = luainjs.createEnv({
        fileExists: p => fs.existsSync(path.join(rootPath, p)),
        loadFile: p => fs.readFileSync(path.join(rootPath, p), { encoding: 'utf8' }),
        osExit: code => (exitCode += code)
    })
    await luaEnv.parseFile('test-runner.lua').execAsync()
}

// TODO: make more official lua 5.3 tests pass (most of them don't pass because they `require "debug"`)
{
    const rootPath = './tests/lua-5.3/'
    const luaEnv = luainjs.createEnv({
        fileExists: p => fs.existsSync(path.join(rootPath, p)),
        loadFile: p => fs.readFileSync(path.join(rootPath, p), { encoding: 'utf8' }),
        osExit: code => process.exit(code)
    })
    await luaEnv.parseFile('goto.lua').execAsync()
    await luaEnv.parseFile('bwcoercion.lua').execAsync()
    await luaEnv.parseFile('logical_operations.lua').execAsync()
}

{
    const luaEnv = luainjs.createEnv()

    async function waitt(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    }

    async function helloBuilder(name) {
        console.log("helloBuilder");
        const NAME = luainjs.utils.coerceArgToString(name, 'sayHi', 1)
        await waitt(3000);
        return `Hello ${NAME}!`
    }
    const myLib = new luainjs.Table({ helloBuilder })
    luaEnv.loadLib('myLib', myLib)

    await luaEnv.parse(`
      mytestfunction = function()
        local hellobuilder =myLib.helloBuilder('John')
        print("mytestfunction");
        print(hellobuilder)
        return hellobuilder
      end
    `).execAsync();

    let str = (await luaEnv.parse("return mytestfunction()").execAsync())[0]


    console.log("STR", str);
    if (str !== 'Hello John!') {
        throw Error("Strings don't match!")
    }
}

{
    const luaEnv = luainjs.createEnv()
    const ext = new luainjs.Table({ foo: () => 'bar' })
    luaEnv.extendLib('math', ext)
    const val = await luaEnv.parse('return math.foo()').execAsync()
    if (val !== 'bar') {
        throw Error('extendLib failed!')
    }
}

{
    const luaEnv = luainjs.createEnv()
    let str
    try {
        str = await luaEnv.parse('return "Backtick `literals` in strings work"').execAsync()
    } catch (e) {
        throw Error('Backticks in strings transpile into invalid code!')
    }
    if (str !== 'Backtick `literals` in strings work') {
        throw Error('Backticks in strings transpile incorrectly!')
    }
}

process.exit(exitCode)

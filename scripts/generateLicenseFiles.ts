import packages from "../pnpmls.json"

interface dep {
    name: string
    version: string
    license: string
}

const objs: [string, Object][] = (packages as Object[]).map(e => {
    return [e.name, e]
});

const deps: dep[] = [];
//console.log(objs)

while (objs.length > 0 ){
    const [depname, depobj] = objs.pop()!
    //console.log(depname, depobj)
    if ("dependencies" in depobj) {
        const subDeps: [string, object][] = Object.entries(depobj['dependencies'] as object)
        objs.push(...subDeps)
    }

    deps.push({
        name: depname,
        version: ("version" in depobj) ? depobj["version"] as string : "No Version Provided",
        license: ("license" in depobj) ? depobj["license"] as string : "\"No License Provided\"",
    })
}

const licenses = new Map<string, string[]>()
deps.forEach(d => {
    if (licenses.has(d.license)) {
        const existingDeps = licenses.get(d.license)!
        licenses.set(d.license, [d.name, ...existingDeps])
    } else {
        licenses.set(d.license, [d.name])
    }
})

let pkgCount = 0;
let licCount = 0;
licenses.forEach((v,k) => {
    licCount += 1
    pkgCount += v.length
    console.log(`license ${k} is used by ${v.length} packages`)
})

console.log(`${licCount} license used across ${pkgCount} packages`)

//console.log(licenses)

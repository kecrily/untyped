import type { Schema, JSType } from './types'
import { escapeKey, unique } from './utils'

const TYPE_MAP: Record<JSType, string> = {
  array: 'any[]',
  bigint: 'bigint',
  boolean: 'boolean',
  number: 'number',
  object: 'any',
  any: 'any',
  string: 'string',
  symbol: 'Symbol',
  function: 'Function'
}

export function generateDts (schema: Schema, name: string = 'MyObject') {
  return `interface ${name} {\n  ` + _genTypes(schema, ' ').join('\n ') + '\n}'
}

function _genTypes (schema: Schema, spaces: string): string[] {
  const buff: string[] = []

  for (const key in schema.properties) {
    const val = schema.properties[key] as Schema
    buff.push(...generateJSDoc(val))
    if (val.type === 'object') {
      buff.push(`${escapeKey(key)}: {`, ..._genTypes(val, spaces + ' '), '},\n')
    } else {
      let type: string
      if (val.type === 'array') {
        const _type = getTsType(val.items.type)
        type = _type.includes('|') ? `(${_type})[]` : `${_type}[]`
      } else {
        type = getTsType(val.type)
      }
      buff.push(`${escapeKey(key)}: ${type},\n`)
    }
  }

  if (buff.length) {
    const last = buff.pop() || ''
    buff.push(last.substr(0, last.length - 1))
  }

  return buff.map(i => spaces + i)
}

function getTsType (type: JSType | JSType[]): string {
  if (Array.isArray(type)) {
    return unique(type.map(t => getTsType(t))).join(' | ') || 'any'
  }
  return (type && TYPE_MAP[type]) || 'any'
}

function generateJSDoc (schema: Schema): string[] {
  const buff = []

  if (schema.title) {
    buff.push(schema.title)
  }

  if (schema.description) {
    buff.push(schema.description)
  }

  if (
    schema.default &&
    schema.type !== 'object' &&
    !(Array.isArray(schema.default) && schema.default.length === 0)
  ) {
    const stringified = JSON.stringify(schema.default) || ''
    buff.push(`@default ${stringified.replace(/\*\//g, '*\\/')}`)
  }

  if (buff.length) {
    return buff.length === 1
      ? ['/** ' + buff[0] + ' */']
      : ['/**', ...buff.map(i => ` * ${i}`), '*/']
  }

  return []
}

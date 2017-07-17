// @flow
import type { Group } from './../types'
import fs from 'file-system'
import * as helpers from './helpers'

process.env.GROUPS_PATH = process.env.GROUPS_PATH || './.groups.store.json'

const defaultData = { 'employee': {} }

export type GroupStore = {
  save (group: Group): void,
  get (groupName: string): Group,
  getAll (): Array<Group>,
  deleteGroup (groupName: string): void
}

export const groupStore: GroupStore = {
  save (group: Group) {
    const data = helpers.readData(process.env.GROUPS_PATH, defaultData)
    data[group.name] = group.accessRules
    fs.writeFileSync(process.env.GROUPS_PATH, JSON.stringify(data))
  },

  get (groupName: string) {
    const data = helpers.readData(process.env.GROUPS_PATH, defaultData)
    return { name: groupName, accessRules: data[groupName] || {} }
  },

  getAll () {
    const data = helpers.readData(process.env.GROUPS_PATH, defaultData)
    return Object.keys(data).map((groupName) => {
      return { name: groupName, accessRules: data[groupName] }
    })
  },

  deleteGroup (groupName: string) {
    const data = helpers.readData(process.env.GROUPS_PATH, defaultData)
    delete data[groupName]
    fs.writeFileSync(process.env.GROUPS_PATH, JSON.stringify(data))
  }
}

// @flow

import { configStore } from '../../../../core/data/config-store'
import { manager } from '../../../../core/service-providers/manager'

export async function configureService (args: { serviceId: string, configJson: string }) {
  const config = JSON.parse(args.configJson)
  configStore.save(args.serviceId, config)
  let provider = manager.getProvider(args.serviceId)
  if (provider) {
    await provider.testConnection()
    return `${args.serviceId} configured!`
  }
}

export function listServices (args: { isConfigured: ?boolean }) {
  const serviceInfos = manager.getServiceInfos()
  if (typeof (args.isConfigured) === 'undefined') {
    return serviceInfos
  }
  return serviceInfos.filter((info) => info.isConfigured === args.isConfigured)
}

export function getService (args: { serviceId: string }) {
  return manager.getServiceInfo(args.serviceId)
}
import React from 'react'
import graphqlApi from '../graphql-api'
import lodash from 'lodash'
import MessagesContainer from './messages-container'

export default class Group extends React.Component {
  state = {
    group: null
  }

  componentWillMount = async () => {
    const query = `{
                	group(name: "${this.props.name}") {
                    name
                    serviceAccessRules {
                      service {
                        id
                        displayName
                        roles
                      }
                      accessRules {
                        asset
                        role
                      }
                    }
                  }
                }`
    const response = await graphqlApi.request(query)

    this.setState({
      group: response.data.group
    })
  }

  removeService = (serviceId) => {
    console.log("todo: remove servcie")
  }

  isRoleEnabled = (role, accessRules) => {
    return !!lodash.find(accessRules, (rule) => rule.asset === "*" && (rule.role === role))
  }

  onRoleClicked = (event, role, serviceId) => {
    event.target.blur()
    const group = this.state.group
    const serviceAccessRule = lodash.find(group.serviceAccessRules, (sar) => sar.service.id === serviceId)
    const accessRules = serviceAccessRule.accessRules

    if (this.isRoleEnabled(role, accessRules)) {
      lodash.remove(accessRules, (rule) => rule.role === role)
    } else {
      accessRules.push({asset: "*", role: role})
    }

    this.save(group)
  }

  mapGroupToMutation = (group) => {
    return `mutation { setGroupAccessRules(
        name:"${group.name}",
        serviceAccessRules:[${group.serviceAccessRules.map(this.mapServiceAccessRuleToMutation).join(',')}]
      )
    }`
  }

  mapServiceAccessRuleToMutation = (serviceAccessRule) => {
    return `{
      serviceId:"${serviceAccessRule.service.id}",
      accessRules: [${serviceAccessRule.accessRules.map(this.mapAccessRuleToMutation).join(',')}]
    }`
  }

  mapAccessRuleToMutation = (accessRule) => {
    return `{
      asset: "${accessRule.asset}",
      role: "${accessRule.role}"
    }`
  }

  save = async (group) => {
    const query = this.mapGroupToMutation(group)
    let response = await graphqlApi.request(query)

    if (response.error) {
      this.messagesContainer.push({
        title: "Error Saving Group",
        body: response.error.message
      })
    } else {
      this.setState({ group: group })
    }
  }

  render() {
    return (
    <div>
      <h1 className='title'>{this.props.name}</h1>
      { this.state.group &&
        <div>
          <h2 className='subtitle'>Access Rules</h2>
          <table className='table'>
            <thead>
              <tr>
                <th>Service</th>
                <th>Roles</th>
                <th className="has-text-right">Options</th>
              </tr>
            </thead>
            <tbody>
              {
                this.state.group.serviceAccessRules.map((serviceAccessRule) => (
                  <tr key={serviceAccessRule.service.id}>
                    <td>{serviceAccessRule.service.displayName}</td>
                    <td>
                      <div className='field is-grouped'>
                        {serviceAccessRule.service.roles.map((role) => (
                          <div key={role} className='control'>
                            <button
                              className={`button is-primary ${this.isRoleEnabled(role, serviceAccessRule.accessRules) ? '' : 'is-outlined'}`}
                              onClick={(e) => this.onRoleClicked(e, role, serviceAccessRule.service.id)}>
                              {role}
                            </button>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className='field is-grouped is-grouped-right'>
                        <div className='control'>
                          <button className='button is-danger is-small'
                            onClick={() => this.removeService(serviceAccessRule.service.id)}>Remove Service</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) )
              }
            </tbody>
          </table>
        </div>
      }
      <MessagesContainer ref={(container) => { this.messagesContainer = container }} />
    </div>)
  }
}
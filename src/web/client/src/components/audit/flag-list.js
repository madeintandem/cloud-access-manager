import React from 'react'
import graphqlApi from '../../graphql-api'
import './flag-list.scss'
import Modal from '../shared/modal'
import UnknownUserForm from './unknown-user-form'
import NewIndividualForm from './new-individual-form'
import GroupSelectionForm from './group-selection-form'
import IndividualAccessRulesForm from './individual-access-rules-form'
import MessagesContainer from '../shared/messages-container'
import lodash from 'lodash'


export default class FlagList extends React.Component {
  state = {
    flags: [],
    showModal: false,
    currentFlag: null,
  }

  flagQueryResponse = `{
    individual {
      id
      primaryEmail
      serviceUserIdentities {
        serviceId
        userIdentity {
          email
          userId
        }
      }
      accessRules {
        service {
          id
        }
        accessRules {
          asset
          role
        }
      }
      groups
    }
    serviceId
    userIdentity {
      email
      userId
      fullName
    }
    assets {
      name
      role
    }
  }`

  componentWillMount = async () => {
    const query = `{
      auditAll ${this.flagQueryResponse}
      groups {
        name
      }
      services(isConfigured:true){
        id
        displayName
        roles
      }
    }`

    const response = await graphqlApi.request(query)
    if (response.error) {
      this.messagesContainer.push({
        title: "Failed to run audit",
        body: response.error.message
      })
      return
    }
    response.data.auditAll.forEach((flag) => {
      flag.key = `${flag.serviceId}${flag.userIdentity.email || flag.userIdentity.userId || new Date().valueOf()}`
    })
    this.groups = response.data.groups.map((g) => g.name)
    this.serviceLookup = {}
    response.data.services.forEach((s) => { this.serviceLookup[s.id] = s })
    this.setState({
      flags: response.data.auditAll
    })
  }

  showModal = (flag) => {
    this.setState({
      showModal: true,
      currentFlag: flag,
      modalTitle: `Manage ${flag.userIdentity.email || flag.userIdentity.userId}`,
      modalContents: flag.individual
        ? <h1>Existing user</h1>
        : <UnknownUserForm flag={flag} onNewIndividualSelected={this.onNewIndividualSelected} />
    })
  }

  closeModal = (event) => {
    if (event) { event.preventDefault() }

    this.setState({
      showModal: false
    })
  }

  onNewIndividualSelected = () => {
    const flag = this.state.currentFlag
    this.setState({
      modalTitle: `Manage ${flag.userIdentity.email || flag.userIdentity.userId || "blah"}`,
      modalContents: <NewIndividualForm flag={flag} onNewIndividualFormComplete={this.onNewIndividualFormComplete} onNewIndividualSelected={this.onNewIndividualSelected} />
    })
  }

  onNewIndividualFormComplete = (fullName, primaryEmail) => {
    if (!fullName || fullName.trim() === "") {
      this.messagesContainer.push({
        title: "Invalid Name",
        body: "Please fill out the individual's name."
      })
      return
    }

    this.pendingNewIndividual = {
      fullName,
      primaryEmail
    }
    this.setState({
      modalTitle: `Select groups`,
      modalContents: <GroupSelectionForm groups={this.groups} onGroupFormComplete={this.onGroupFormComplete} individual={this.pendingNewIndividual} />
    })
  }

  setIndividualAccessRules = async (selectedAccessRules) => {
    const flag = this.state.currentFlag
    const query = `mutation {
      addIndividualAccessRules(
        individualId: "${flag.individual.id}",
        serviceId: "${flag.serviceId}",
        accessRules: [${selectedAccessRules.map((rule) => `{
          asset: "${rule.asset}",
          role: "${rule.role}"
        }`).join(',')}])
    }`
    const response = await graphqlApi.request(query)
    if (response.error) {
      this.messagesContainer.push({
        title: "Failed to add selected access rules",
        body: response.error.message
      })
    } else {
      const newFlag = await this.reCheckFlag(flag)
      const flags = this.state.flags
      const flagIndex = lodash.findIndex(flags, (f) => f.key == flag.key)
      if (newFlag) {
        flags[flagIndex] = newFlag
      } else {
        delete flags[flagIndex]
      }

      this.setState({
        showModal: false,
        flags
      })
    }
  }

  reCheckFlag = async (flag) => {
    const secondParameter = flag.userIdentity.email ? `email: "${flag.userIdentity.email}"`  : `userId: "${flag.userIdentity.userId}"`

    const query = `{
      auditServiceUserAccount(serviceId: "${flag.serviceId}", ${secondParameter}) ${this.flagQueryResponse}
    }`
    const response = await graphqlApi.request(query)

    if(response.error) {
      this.messagesContainer.push({
        title: 'Failed to check flag',
        body: response.error.message
      })
    } else {
      const newFlag = response.data.auditServiceUserAccount
      if (newFlag) {
        newFlag.key = flag.key
        return newFlag
      }
    }
  }

  onGroupFormComplete = async (selectedGroups) => {
    this.pendingNewIndividual.groups = selectedGroups
    const flag = this.state.currentFlag

    const query = `mutation {
      createIndividual(individual: {
        fullName: ""
        ${this.pendingNewIndividual.primaryEmail ? `primaryEmail: "${this.pendingNewIndividual.primaryEmail}"` : ''}
        groups: [${selectedGroups.map((g) => `"${g}"`).join(',')}]
      })
    }`

    const response = await graphqlApi.request(query)
    if (response.error) {
      this.messagesContainer.push({
        title: 'Failed to Save New Individual',
        body: response.error.message
      })
    } else {
      const newFlag = await this.reCheckFlag(flag)
      const flags = this.state.flags
      const flagIndex = lodash.findIndex(flags, (f) => f.key == flag.key)
      if (newFlag) {
        flags[flagIndex] = newFlag
        this.setState({
          flags,
          currentFlag: newFlag,
          modalTitle: "Set Individual Access Rules",
          modalContents: <IndividualAccessRulesForm service={this.serviceLookup[newFlag.serviceId]} assets={newFlag.assets} onAccessRuleSelection={this.setIndividualAccessRules} />
        })
      } else {
        delete flags[flagIndex]
        this.setState({
          showModal: false,
          flags
        })
      }
    }
  }

  render() {
    const flags = this.state.flags
    return (
      <div>
        { flags.length > 0  &&
          <h2>
            {flags.length} SERVICE ACCOUNTS
          </h2>
        }

        <table className='table flag-table'>
          <tbody className='uppercase-text'>
            {flags.map((flag) => (
              <tr key={flag.key} onClick={() => this.showModal(flag)}>
                <td className='column-padding'><span className='service-name column-padding'>{ flag.serviceId } { flag.userIdentity.email ? "EMAIL" : "USERNAME" }:</span> <span className='user-identity'>{ flag.userIdentity.email || flag.userIdentity.userId || flag.userIdentity.fullName }</span></td>
                <td>
                  <span className='service-name'>SERVICE:</span>
                    <span className='service-id'>{ flag.serviceId }</span> / { flag.assets.map((asset) => { asset.name }).length } PROJECTS PENDING
                </td>
              </tr>
            )
            )}
          </tbody>
        </table>

        { this.state.showModal &&
          <Modal title={this.state.modalTitle} closeHandler={this.closeModal}>
            { this.state.modalContents }
          </Modal>
        }

        <MessagesContainer ref={(container) => { this.messagesContainer = container }} />
      </div>
    )
  }
}
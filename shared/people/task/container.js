// @flow
import {Task} from '.'
import * as PeopleGen from '../../actions/people-gen'
import * as Types from '../../constants/types/people'
import * as Tabs from '../../constants/tabs'
import * as SettingsTabs from '../../constants/settings'
import {todoTypes} from '../../constants/people'
import {connect, branch, compose, renderNothing} from '../../util/container'
import {type TypedState} from '../../constants/reducer'
import {createGetMyProfile} from '../../actions/tracker-gen'
import {navigateAppend, switchTo, navigateTo} from '../../actions/route-tree'
import {createShowUserProfile} from '../../actions/profile-gen'
import openURL from '../../util/open-url'
import {isMobile} from '../../constants/platform'

const installLinkURL = 'https://keybase.io/download'

const onSkipTodo = (type: Types.TodoType, dispatch: Dispatch) => () =>
  dispatch(PeopleGen.createSkipTodo({type}))

const mapStateToProps = (state: TypedState) => ({myUsername: state.config.username})

// ----- BIO ----- //
const bioConnector = connect(
  mapStateToProps,
  (dispatch: Dispatch) => ({
    _onConfirm: (username: string) => {
      // make sure we have tracker state & profile is up to date
      dispatch(createGetMyProfile({}))
      dispatch(navigateAppend(['editProfile'], [Tabs.peopleTab]))
    },
    onDismiss: () => {},
  }),
  (stateProps, dispatchProps, ownProps) => ({
    ...ownProps,
    onConfirm: () => dispatchProps._onConfirm(stateProps.myUsername),
    onDismiss: dispatchProps.onDismiss,
  })
)

// ----- PROOF ----- //
const proofConnector = connect(
  mapStateToProps,
  (dispatch: Dispatch) => ({
    _onConfirm: (username: string) => dispatch(createShowUserProfile({username})),
    onDismiss: onSkipTodo('proof', dispatch),
  }),
  (stateProps, dispatchProps, ownProps) => ({
    ...ownProps,
    onConfirm: () => dispatchProps._onConfirm(stateProps.myUsername),
    onDismiss: dispatchProps.onDismiss,
  })
)

// ----- DEVICE ----- //
const deviceConnector = connect(
  () => ({}),
  (dispatch: Dispatch) => ({
    onConfirm: () => openURL(installLinkURL),
    onDismiss: onSkipTodo('device', dispatch),
  })
)

// ----- FOLLOW ----- //
const followConnector = connect(
  () => ({}),
  (dispatch: Dispatch) => ({
    onConfirm: () => dispatch(navigateAppend(['search'], [Tabs.peopleTab])),
    onDismiss: onSkipTodo('follow', dispatch),
  })
)

// ----- CHAT ----- //
const chatConnector = connect(
  () => ({}),
  (dispatch: Dispatch) => ({
    onConfirm: () => dispatch(switchTo([Tabs.chatTab])),
    onDismiss: onSkipTodo('chat', dispatch),
  })
)

// ----- PAPERKEY ----- //
const paperKeyConnector = connect(
  () => ({}),
  (dispatch: Dispatch) => ({
    onConfirm: () => {
      if (!isMobile) {
        dispatch(switchTo([Tabs.devicesTab]))
      } else {
        dispatch(navigateTo([SettingsTabs.devicesTab], [Tabs.settingsTab]))
        dispatch(switchTo([Tabs.settingsTab]))
      }
    },
    onDismiss: () => {},
  })
)

// ----- TEAM ----- //
const teamConnector = connect(
  () => ({}),
  (dispatch: Dispatch) => ({
    onConfirm: () => {
      dispatch(navigateAppend(['showNewTeamDialog'], [Tabs.teamsTab]))
      dispatch(switchTo([Tabs.teamsTab]))
    },
    onDismiss: onSkipTodo('team', dispatch),
  })
)

// ----- FOLDER ----- //
const folderConnector = connect(
  () => ({}),
  (dispatch: Dispatch) => ({
    onConfirm: () => {
      if (!isMobile) {
        dispatch(navigateTo(['private'], [Tabs.folderTab]))
        dispatch(switchTo([Tabs.folderTab]))
      } else {
        dispatch(navigateTo([SettingsTabs.foldersTab, 'private'], [Tabs.settingsTab]))
        dispatch(switchTo([Tabs.settingsTab]))
      }
    },
    onDismiss: onSkipTodo('folder', dispatch),
  })
)

// ----- GITREPO ----- //
const gitRepoConnector = connect(
  () => ({}),
  (dispatch: Dispatch) => ({
    onConfirm: () => {
      dispatch(navigateTo([{selected: 'newRepo', props: {isTeam: false}}], [Tabs.gitTab]))
      dispatch(switchTo([Tabs.gitTab]))
    },
    onDismiss: onSkipTodo('gitRepo', dispatch),
  })
)

// ----- TEAMSHOWCASE ----- //
const teamShowcaseConnector = connect(
  () => ({}),
  (dispatch: Dispatch) => ({
    onConfirm: () => {
      // TODO find a team that the current user is an admin of and nav there?
      dispatch(navigateTo([], [Tabs.teamsTab]))
      dispatch(switchTo([Tabs.teamsTab]))
    },
    onDismiss: onSkipTodo('teamShowcase', dispatch),
  })
)

export default compose(
  // TODO maybe have an object
  branch(props => props.todoType === todoTypes.bio, bioConnector),
  branch(props => props.todoType === todoTypes.proof, proofConnector),
  branch(props => props.todoType === todoTypes.device, deviceConnector),
  branch(props => props.todoType === todoTypes.follow, followConnector),
  branch(props => props.todoType === todoTypes.chat, chatConnector),
  branch(props => props.todoType === todoTypes.paperkey, paperKeyConnector),
  branch(props => props.todoType === todoTypes.team, teamConnector),
  branch(props => props.todoType === todoTypes.folder, folderConnector),
  branch(props => props.todoType === todoTypes.gitRepo, gitRepoConnector),
  branch(props => props.todoType === todoTypes.teamShowcase, teamShowcaseConnector),
  branch(props => !props.onConfirm, renderNothing)
)(Task)

import {createServer} from '@jurca/post-message-rpc'
import {PageImpl} from './Page'

export const COMMUNICATION_CHANNEL_ID = 'karma end-to-end testing'

createServer(COMMUNICATION_CHANNEL_ID, [], PageImpl)

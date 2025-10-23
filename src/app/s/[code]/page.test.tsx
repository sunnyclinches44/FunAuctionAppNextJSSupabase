import { render, screen } from '@testing-library/react'
import SessionRoom from './page'

jest.mock('next/navigation', () => ({
  useParams: () => ({ code: 'test-auction' }),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/s/test-auction',
}))

// Mock modules before component import
jest.mock('@/store/useSessionStore', () => ({
  useSessionStore: jest.fn(),
  useCurrentSession: jest.fn(),
  useParticipants: jest.fn(),
  useTotalAmount: jest.fn(),
  useIsLoading: jest.fn(),
  useError: jest.fn(),
  useRtReady: jest.fn(),
}))
jest.mock('@/lib/utils', () => ({
  getOrCreateDeviceId: jest.fn(),
  getDisplayName: jest.fn(),
  saveDisplayName: jest.fn(),
}))
jest.mock('@/hooks/useRealTime', () => ({
  useRealTime: jest.fn(),
}))
jest.mock('@/hooks/useBidding', () => ({
  useBidding: jest.fn(),
}))
jest.mock('@/components/session/ModernSessionLayout', () => ({
  __esModule: true,
  default: (props: any) => (
    <div>
      <h1>{props.session?.name}</h1>
      {!props.hasJoined && <input placeholder="Enter your name..." />}
      {props.hasJoined && <div>Welcome, {props.displayName}!</div>}
    </div>
  ),
}))

import {
  useSessionStore,
  useCurrentSession,
  useParticipants,
  useIsLoading,
  useError,
} from '@/store/useSessionStore'
import { getOrCreateDeviceId, getDisplayName } from '@/lib/utils'
import { useBidding } from '@/hooks/useBidding'

// Type assertion for mocks
const useSessionStoreMock = useSessionStore as jest.Mock
const useCurrentSessionMock = useCurrentSession as jest.Mock
const useParticipantsMock = useParticipants as jest.Mock
const useIsLoadingMock = useIsLoading as jest.Mock
const useErrorMock = useError as jest.Mock
const getOrCreateDeviceIdMock = getOrCreateDeviceId as jest.Mock
const getDisplayNameMock = getDisplayName as jest.Mock
const useBiddingMock = useBidding as jest.Mock

describe('SessionRoom', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
    useIsLoadingMock.mockReturnValue(true)
    useErrorMock.mockReturnValue(null)
    useCurrentSessionMock.mockReturnValue(null)
    useParticipantsMock.mockReturnValue([])
    useSessionStoreMock.mockReturnValue({
      loadSession: jest.fn(),
      joinSession: jest.fn(),
      placeBid: jest.fn(),
    })
    getOrCreateDeviceIdMock.mockReturnValue('test-device-id')
    getDisplayNameMock.mockReturnValue('')
    useBiddingMock.mockReturnValue({
      isPlacingBid: false,
      showCustomInput: null,
      customAmount: '',
      placeBid: jest.fn(),
      placeCustomBid: jest.fn(),
      setCustomInput: jest.fn(),
      updateCustomAmount: jest.fn(),
      undoBid: jest.fn(),
    })
  })

  it('renders loading state initially', () => {
    render(<SessionRoom />)
    expect(screen.getByText('Loading session...')).toBeInTheDocument()
  })

  it('renders error state', () => {
    useIsLoadingMock.mockReturnValue(false)
    useErrorMock.mockReturnValue('Failed to load session')
    render(<SessionRoom />)
    expect(screen.getByText('Error Loading Session')).toBeInTheDocument()
    expect(screen.getByText('Failed to load session')).toBeInTheDocument()
  })

  it('renders the session when loaded and user has not joined', () => {
    useIsLoadingMock.mockReturnValue(false)
    useCurrentSessionMock.mockReturnValue({
      id: '123',
      name: 'Test Auction',
      code: 'TEST',
      status: 'not_started',
      created_at: new Date().toISOString(),
      created_by: 'test-user',
    })
    render(<SessionRoom />)
    expect(screen.getByText('Test Auction')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your name...')).toBeInTheDocument()
  })

  it('renders the session when loaded and user has joined', () => {
    useIsLoadingMock.mockReturnValue(false)
    useCurrentSessionMock.mockReturnValue({
      id: '123',
      name: 'Test Auction',
      code: 'TEST',
      status: 'not_started',
      created_at: new Date().toISOString(),
      created_by: 'test-user',
    })
    useParticipantsMock.mockReturnValue([
      {
        id: 'p1',
        device_id: 'test-device-id',
        display_name: 'Jules',
        session_id: '123',
        bid_total: 0,
        bid_count: 0,
        created_at: new Date().toISOString(),
      },
    ])
    getOrCreateDeviceIdMock.mockReturnValue('test-device-id')

    render(<SessionRoom />)
    expect(screen.getByText('Test Auction')).toBeInTheDocument()
    expect(screen.getByText('Welcome, Jules!')).toBeInTheDocument()
  })
})

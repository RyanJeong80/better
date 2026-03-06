export type VoteChoice = 'A' | 'B'

export interface BattleWithStats {
  id: string
  userId: string
  title: string
  imageAUrl: string
  imageBUrl: string
  createdAt: string
  closedAt: string | null
  votesA: number
  votesB: number
  totalVotes: number
  userVote: VoteChoice | null
  author: {
    id: string
    name: string | null
    avatarUrl: string | null
  }
}

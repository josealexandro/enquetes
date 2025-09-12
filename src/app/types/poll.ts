export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Comment {
  id: string;
  pollId: string;
  parentId?: string; // Optional: for replies to a comment
  author: string;
  text: string;
  timestamp: number; // Using timestamp for easy sorting
}

export interface Poll {
  id: string;
  title: string;
  options: PollOption[];
  creator: {
    name: string;
    avatarUrl: string;
  };
  createdAt: number; // Timestamp for sorting by recency
  creatorId?: string; // Optional: for filtering "My Polls" if user authentication is implemented
}


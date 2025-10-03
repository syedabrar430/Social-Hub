export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  education_school?: string;
  education_degree?: string;
  location?: string;
  phone?: string;
  profile_picture_url?: string;
  following: number;
  followers: number;
}

export interface Post {
  id: string;
  userId: string;
  user: User;
  content: string;
  image?: string;
  timestamp: string;
  likes: number;
  comments: Comment[];
  shares: number;
  isLiked: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  user: User;
  content: string;
  timestamp: string;
  likes: number;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention';
  from: User;
  content: string;
  timestamp: string;
  read: boolean;
  postId?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage: Message;
  messages: Message[];
}

// Mock Users
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Emma Johnson',
    email: 'emma@example.com',
    avatar: '👩‍💼',
    bio: 'UI/UX Designer passionate about creating beautiful experiences',
    following: 245,
    followers: 1200,
  },
  {
    id: '2',
    name: 'Alex Chen',
    email: 'alex@example.com',
    avatar: '👨‍💻',
    bio: 'Full-stack developer & coffee enthusiast',
    following: 180,
    followers: 890,
  },
  {
    id: '3',
    name: 'Sarah Wilson',
    email: 'sarah@example.com',
    avatar: '👩‍🎨',
    bio: 'Digital artist and creative director',
    following: 320,
    followers: 2100,
  },
  {
    id: '4',
    name: 'Mike Rodriguez',
    email: 'mike@example.com',
    avatar: '👨‍📷',
    bio: 'Photographer capturing life\'s beautiful moments',
    following: 150,
    followers: 750,
  },
];

export const currentUser = mockUsers[0];

// Mock Posts
export const mockPosts: Post[] = [];

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'like',
    from: mockUsers[1],
    content: 'liked your post',
    timestamp: '5 minutes ago',
    read: false,
    postId: '1',
  },
  {
    id: '2',
    type: 'comment',
    from: mockUsers[2],
    content: 'commented on your post',
    timestamp: '1 hour ago',
    read: false,
    postId: '2',
  },
  {
    id: '3',
    type: 'follow',
    from: mockUsers[3],
    content: 'started following you',
    timestamp: '2 hours ago',
    read: true,
  },
  {
    id: '4',
    type: 'mention',
    from: mockUsers[1],
    content: 'mentioned you in a comment',
    timestamp: '3 hours ago',
    read: true,
    postId: '3',
  },
];

// Mock Messages
export const mockMessages: Message[] = [
  {
    id: '1',
    senderId: '2',
    receiverId: '1',
    content: 'Hey Emma! Did you see the new design trends article?',
    timestamp: '10:30 AM',
    read: true,
  },
  {
    id: '2',
    senderId: '1',
    receiverId: '2',
    content: 'Yes! The minimalist approach is really interesting.',
    timestamp: '10:45 AM',
    read: true,
  },
  {
    id: '3',
    senderId: '2',
    receiverId: '1',
    content: 'I think we should implement some of those ideas in our next project.',
    timestamp: '10:47 AM',
    read: true,
  },
  {
    id: '4',
    senderId: '1',
    receiverId: '2',
    content: 'Absolutely! Let\'s schedule a meeting to discuss this further.',
    timestamp: '10:50 AM',
    read: false,
  },
];

// Mock Conversations
export const mockConversations: Conversation[] = [
  {
    id: '1',
    participants: [mockUsers[0], mockUsers[1]],
    lastMessage: mockMessages[3],
    messages: mockMessages.filter(msg => 
      (msg.senderId === '1' && msg.receiverId === '2') || 
      (msg.senderId === '2' && msg.receiverId === '1')
    ),
  },
  {
    id: '2',
    participants: [mockUsers[0], mockUsers[2]],
    lastMessage: {
      id: '5',
      senderId: '3',
      receiverId: '1',
      content: 'Thanks for the feedback on my artwork!',
      timestamp: '2:15 PM',
      read: true,
    },
    messages: [
      {
        id: '5',
        senderId: '3',
        receiverId: '1',
        content: 'Thanks for the feedback on my artwork!',
        timestamp: '2:15 PM',
        read: true,
      },
    ],
  },
];
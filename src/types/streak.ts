export type StreakGroup = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  icon: string;
  daily_goal: number;
  required_members: number;
  created_at: string;
};

export type StreakMember = {
  id: string;
  group_id: string;
  user_id: string;
  status: string;
  joined_at: string;
};

export type StreakActivity = {
  id: string;
  group_id: string;
  user_id: string;
  activity_date: string;
  completed: boolean;
};

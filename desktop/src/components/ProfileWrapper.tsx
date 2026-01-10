import { useParams } from "react-router-dom";
import Profile from "./Profile";

interface ProfileWrapperProps {
  user: any;
}

export default function ProfileWrapper({ user }: ProfileWrapperProps) {
  const { userId } = useParams<{ userId?: string }>();
  return <Profile user={user} userId={userId} />;
}


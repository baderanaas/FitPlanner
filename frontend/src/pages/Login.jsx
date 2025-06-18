import { SignIn } from "@clerk/clerk-react";

export default function Login() {
  return (
    <div className="d-flex w-100 h-100">
      <SignIn signInUrl="/register" forceRedirectUrl={"/chat"}/>
    </div>
  );
}

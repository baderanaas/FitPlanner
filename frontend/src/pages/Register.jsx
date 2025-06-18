import { SignUp } from "@clerk/clerk-react";

export default function Register() {
  return (
    <div className="d-flex w-100 h-100">
      <SignUp signInUrl="/login" forceRedirectUrl={"/Chat"} />
    </div>
  );
}

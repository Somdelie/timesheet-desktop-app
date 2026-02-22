import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Card className="w-full max-w-md p-2">
        <CardHeader className="flex items-center justify-between bg-muted rounded py-1">
          <img src="./logo2.png" alt="Logo" className="w-34 h-12" />
          <CardTitle className="text-center text-2xl text-primary">
            Welcome Back
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}

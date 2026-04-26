import { redirect } from "next/navigation";

// 소셜 로그인이 회원가입을 겸하므로 /login으로 리다이렉트
export default function RegisterPage() {
  redirect("/login");
}

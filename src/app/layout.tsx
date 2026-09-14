import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Commute Compare — 通勤方案比较器",
  description:
    "给每种通勤方案快/常见/慢三个时间和一个花费，蒙特卡洛模拟一个月：总时间、总花费、迟到概率，以及几点出门才能把迟到概率压到你能接受的水平。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

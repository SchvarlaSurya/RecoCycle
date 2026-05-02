import { Inter, Playfair_Display } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter" 
});

const playfair = Playfair_Display({ 
  subsets: ["latin"], 
  style: ['italic', 'normal'],
  variable: "--font-playfair" 
});

export const metadata = {
  title: "RecoCycle",
  description: "RecoCycle adalah platform pengelolaan sampah terpilah dengan pickup terjadwal, reward transparan, dan dashboard dampak.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}

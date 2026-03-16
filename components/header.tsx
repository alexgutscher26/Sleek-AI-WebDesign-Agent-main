"use client"

import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { Logo } from "./logo"
import { Button } from "./ui/button"
import { DarkModeToggle } from "./dark-mode-toggle"
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs"
import { Spinner } from "./ui/spinner"
import GlobalCommandPalette from "./global-command-palette"

const Header = () => {
  const pathname = usePathname()
  const { isLoaded } = useAuth();

  const isProjectPage = pathname.startsWith('/project/')
  const isHomePage = pathname === "/"

  return (
    <header className={cn("w-full", isHomePage && "pointer-events-none absolute inset-x-0 top-0 z-40")}>
      <div className={cn(`w-full flex py-3.5 px-8
         items-center justify-between
         `,
        isHomePage && "pointer-events-auto mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8",
        isProjectPage && "absolute top-0 z-50 px-2 py-1 right-0 w-auto"
      )}>

        <div>
          {!isProjectPage && <Logo />}
        </div>

        <div
          className={cn(
            "flex items-center justify-end gap-3",
            isProjectPage && "hidden md:flex"
          )}
        >
          <GlobalCommandPalette />
          <DarkModeToggle />

          {!isLoaded ? <Spinner className="w-8 h-8" /> : (
            <>
              <SignedOut>
                <SignInButton>
                  <Button variant="outline">Login</Button>
                </SignInButton>
                <SignUpButton>
                  <Button>Sign up</Button>
                </SignUpButton>
              </SignedOut>

              <SignedIn>
                <UserButton
                  afterSignOutUrl="/"
                />
              </SignedIn>

            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header

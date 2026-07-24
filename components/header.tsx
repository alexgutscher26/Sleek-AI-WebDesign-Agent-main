"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton, useAuth } from "@clerk/nextjs"
import { DarkModeToggle } from "./dark-mode-toggle"
import GlobalCommandPalette from "./global-command-palette"
import { Logo } from "./logo"
import { AutosaveIndicator, SaveStatus } from "./ui/autosave-indicator"
import { Button } from "./ui/button"
import { Spinner } from "./ui/spinner"

interface HeaderProps {
  saveStatus?: SaveStatus
  lastSaved?: Date | number | string | null
}

const Header = ({ saveStatus, lastSaved }: HeaderProps) => {
  const pathname = usePathname()
  const { isLoaded } = useAuth()

  const isProjectPage = pathname.startsWith("/project/")
  const isHomePage = pathname === "/"

  return (
    <header
      className={cn("w-full", isHomePage && "pointer-events-none absolute inset-x-0 top-0 z-40")}
    >
      <div
        className={cn(
          `flex w-full items-center justify-between px-8 py-3.5`,
          isHomePage && "pointer-events-auto mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8",
          isProjectPage && "absolute top-0 right-0 z-50 w-auto px-2 py-1"
        )}
      >
        <div>{!isProjectPage && <Logo />}</div>

        <div
          className={cn("flex items-center justify-end gap-3", isProjectPage && "hidden md:flex")}
        >
          {isProjectPage && saveStatus && (
            <AutosaveIndicator status={saveStatus} lastSaved={lastSaved} />
          )}
          <GlobalCommandPalette />
          <DarkModeToggle />

          {!isLoaded ? (
            <Spinner className="h-8 w-8" />
          ) : (
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
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header

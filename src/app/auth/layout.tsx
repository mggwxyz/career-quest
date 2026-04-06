import { CosmicBackground } from '@/components/cosmic-background'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative -mt-20 px-6">
      <CosmicBackground />
      {children}
    </div>
  )
}

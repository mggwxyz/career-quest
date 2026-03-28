import { StarField } from '@/components/star-field'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative -mt-20 px-6">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 500px 350px at 30% 25%, rgba(88, 28, 135, 0.25) 0%, transparent 70%),
            radial-gradient(ellipse 400px 300px at 70% 75%, rgba(30, 58, 138, 0.2) 0%, transparent 70%)
          `,
        }} />
        <StarField count={40} />
      </div>
      {children}
    </div>
  )
}

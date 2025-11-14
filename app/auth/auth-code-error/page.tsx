import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            There was an issue verifying your email. Please try again or contact support.
          </p>
        </div>
        <div>
          <Link
            href="/login"
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  )
}



import { logoutAccount } from '@/lib/actions/user.actions'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import React from 'react'

const Footer = ({ user, type = 'desktop' }: FooterProps) => {
  const router = useRouter();

  const handleLogOut = async () => {
    await logoutAccount();
    router.push('/sign-in');
  }

  return (
    <footer className="footer">
      <div className={type === 'mobile' ? 'footer_name-mobile' : 'footer_name'}>
        <p className="text-xl font-bold text-white">
          {user?.firstName[0]}
        </p>
      </div>

      <div className={type === 'mobile' ? 'footer_email-mobile' : 'footer_email'}>
          <h1 className="text-14 truncate text-white font-semibold">
            {user?.firstName}
          </h1>
          <p className="text-14 truncate font-normal text-gray-300">
            {user?.email}
          </p>
      </div>

      <div className="footer_image" onClick={handleLogOut}>
        <Image src="icons/logout.svg" fill alt="jsm" className="invert" />
      </div>
    </footer>
  )
}

export default Footer
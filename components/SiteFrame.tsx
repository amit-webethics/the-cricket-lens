'use client';
import {usePathname} from 'next/navigation';import Header from './Header';import Footer from './Footer';
export default function SiteFrame({children,settings}:{children:React.ReactNode;settings?:any}){const path=usePathname();if(path.startsWith('/admin'))return <>{children}</>;return <div className="shell"><Header settings={settings}/>{children}<Footer settings={settings}/></div>}

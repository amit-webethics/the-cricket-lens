'use client';

import {usePathname} from 'next/navigation';
import Script from 'next/script';
import Header from './Header';
import Footer from './Footer';

const containerId='GTM-MWP8XKT2';
const tagManagerBootstrap=`
(function(w,d,s,l,i){
  w[l]=w[l]||[];
  w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
  var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!=='dataLayer'?'&l='+l:'';
  j.async=true;
  j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
  f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer',${JSON.stringify(containerId)});
`;

export default function SiteFrame({children,settings,enableTagManager=false}:{
  children:React.ReactNode;
  settings?:any;
  enableTagManager?:boolean;
}){
  const path=usePathname();
  if(path.startsWith('/admin'))return <>{children}</>;
  const layout=path==='/'?'shell-home':path.startsWith('/articles/')||path.startsWith('/news/')?'shell-detail':'';

  return <>
    {enableTagManager&&<>
      <Script id="cricket-lens-tag-manager" strategy="afterInteractive">{tagManagerBootstrap}</Script>
      <noscript><iframe title="Google Tag Manager" src={`https://www.googletagmanager.com/ns.html?id=${containerId}`} width="0" height="0" hidden/></noscript>
    </>}
    <div className={`shell ${layout}`}>
      <Header settings={settings}/>
      {children}
      <Footer settings={settings}/>
    </div>
  </>;
}

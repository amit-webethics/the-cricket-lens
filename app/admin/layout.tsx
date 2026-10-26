import AdminShell from '../../components/admin/AdminShell';import './admin.css';import {configured} from '../../lib/cms/auth';
export const metadata={title:'Editorial Studio',robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return <AdminShell setupRequired={!configured()}>{children}</AdminShell>}

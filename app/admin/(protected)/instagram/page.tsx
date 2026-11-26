import {Suspense} from 'react';
import InstagramComposer from '../../../../components/admin/InstagramComposer';

export default function Page() {
  return <Suspense fallback={<p className="admin-loading">Opening Instagram composer…</p>}><InstagramComposer/></Suspense>;
}

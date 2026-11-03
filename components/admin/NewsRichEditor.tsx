'use client';
import {useEffect,useRef,useState} from 'react';
import {EditorContent,useEditor,useEditorState} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {newsDetailsHtml} from '../../lib/cms/rich-text';
export default function NewsRichEditor({value,format,onChange,disabled=false}:{value:string;format?:string;onChange:(html:string)=>void;disabled?:boolean}){
 const[linkOpen,setLinkOpen]=useState(false);const[link,setLink]=useState('');const[error,setError]=useState('');
 const html=newsDetailsHtml(value,format);const lastContent=useRef(html);
 const editor=useEditor({extensions:[StarterKit.configure({heading:{levels:[2,3]},codeBlock:false,code:false,link:{openOnClick:false,autolink:false,protocols:['https','http','mailto']}})],content:html,immediatelyRender:false,editable:!disabled,editorProps:{attributes:{role:'textbox','aria-label':'Full content for the news detail page','aria-multiline':'true',class:'admin-rich-content'}},onUpdate:({editor})=>{const next=editor.isEmpty?'':editor.getHTML();lastContent.current=newsDetailsHtml(next,'html');onChange(next);}});
 useEffect(()=>{if(editor&&lastContent.current!==html){editor.commands.setContent(html,{emitUpdate:false});lastContent.current=html;}},[editor,html]);
 useEffect(()=>{editor?.setEditable(!disabled);},[editor,disabled]);
 const state=useEditorState({editor,selector:({editor})=>editor?{bold:editor.isActive('bold'),italic:editor.isActive('italic'),underline:editor.isActive('underline'),h2:editor.isActive('heading',{level:2}),h3:editor.isActive('heading',{level:3}),bullet:editor.isActive('bulletList'),ordered:editor.isActive('orderedList'),quote:editor.isActive('blockquote'),link:editor.isActive('link'),undo:editor.can().undo(),redo:editor.can().redo()}:null});
 const button=(label:string,active:boolean|undefined,action:()=>void,unavailable=false)=><button type="button" aria-pressed={!!active} disabled={disabled||!editor||unavailable} onMouseDown={e=>e.preventDefault()} onClick={action}>{label}</button>;
 return <div className="admin-rich-editor"><div className="admin-rich-toolbar" role="group" aria-label="News formatting">
 {button('Bold',state?.bold,()=>editor?.chain().focus().toggleBold().run())}{button('Italic',state?.italic,()=>editor?.chain().focus().toggleItalic().run())}{button('Underline',state?.underline,()=>editor?.chain().focus().toggleUnderline().run())}
 {button('Paragraph',editor?.isActive('paragraph'),()=>editor?.chain().focus().setParagraph().run())}{button('Heading 2',state?.h2,()=>editor?.chain().focus().toggleHeading({level:2}).run())}{button('Heading 3',state?.h3,()=>editor?.chain().focus().toggleHeading({level:3}).run())}
 {button('Bullet list',state?.bullet,()=>editor?.chain().focus().toggleBulletList().run())}{button('Numbered list',state?.ordered,()=>editor?.chain().focus().toggleOrderedList().run())}{button('Quote',state?.quote,()=>editor?.chain().focus().toggleBlockquote().run())}
 {button('Link',state?.link,()=>{setLink(editor?.getAttributes('link').href||'');setError('');setLinkOpen(!linkOpen)})}{button('Remove link',false,()=>editor?.chain().focus().unsetLink().run(),!state?.link)}
 {button('Clear formatting',false,()=>editor?.chain().focus().clearNodes().unsetAllMarks().run())}{button('Undo',false,()=>editor?.chain().focus().undo().run(),!state?.undo)}{button('Redo',false,()=>editor?.chain().focus().redo().run(),!state?.redo)}
 </div>{linkOpen&&<div className="admin-rich-link"><label>Link URL<input autoFocus type="url" value={link} placeholder="https://…" onChange={e=>setLink(e.target.value)}/></label><button type="button" disabled={disabled} onClick={()=>{if(!/^(https?:\/\/|mailto:)/i.test(link.trim())){setError('Enter an HTTP, HTTPS or email link.');return;}editor?.chain().focus().extendMarkRange('link').setLink({href:link.trim()}).run();setLinkOpen(false);setError('')}}>Apply link</button><button type="button" onClick={()=>{setLinkOpen(false);setError('')}}>Cancel</button>{error&&<small role="alert">{error}</small>}</div>}
 <EditorContent editor={editor}/>{!editor&&<p className="admin-help">Opening formatting editor…</p>}<small className="admin-help">Select text to format it. Paste text from your source, then review and rewrite before publishing.</small></div>;
}

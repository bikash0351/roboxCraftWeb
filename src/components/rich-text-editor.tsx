
"use client";

import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useCallback } from 'react';
import { Bold, Italic, Strikethrough, Code, Link as LinkIcon, List, ListOrdered, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Input } from './ui/input';

const TiptapEditor = ({ value, onChange, onImageUpload }: { value: string, onChange: (content: string) => void, onImageUpload: (file: File) => Promise<string> }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none min-h-[300px] border border-input rounded-md p-4',
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);
  
  const addImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0] && editor) {
        const file = event.target.files[0];
        try {
            const url = await onImageUpload(file);
            editor.chain().focus().setImage({ src: url }).run();
        } catch (error) {
            console.error("Image upload failed:", error);
            alert("Image upload failed.");
        }
    }
  };


  if (!editor) {
    return null;
  }

  return (
    <div>
        <div className="flex items-center gap-1 border border-input rounded-t-md p-2 bg-muted/50">
            <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()} className={cn(editor.isActive('bold') ? 'is-active' : '')}><Bold className="h-4 w-4"/></Button>
            <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn(editor.isActive('italic') ? 'is-active' : '')}><Italic className="h-4 w-4"/></Button>
            <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleStrike().run()} className={cn(editor.isActive('strike') ? 'is-active' : '')}><Strikethrough className="h-4 w-4"/></Button>
            <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleCode().run()} className={cn(editor.isActive('code') ? 'is-active' : '')}><Code className="h-4 w-4"/></Button>
             <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={cn(editor.isActive('heading', { level: 2 }) ? 'is-active' : '')}>H2</Button>
            <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={cn(editor.isActive('heading', { level: 3 }) ? 'is-active' : '')}>H3</Button>
            <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn(editor.isActive('bulletList') ? 'is-active' : '')}><List className="h-4 w-4"/></Button>
            <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn(editor.isActive('orderedList') ? 'is-active' : '')}><ListOrdered className="h-4 w-4"/></Button>
            <Button variant="ghost" size="icon" onClick={setLink} className={cn(editor.isActive('link') ? 'is-active' : '')}><LinkIcon className="h-4 w-4"/></Button>
            <label htmlFor="image-upload" className="cursor-pointer">
                <Button variant="ghost" size="icon" asChild>
                    <div><ImageIcon className="h-4 w-4" /></div>
                </Button>
            </label>
            <input id="image-upload" type="file" accept="image/*" onChange={addImage} className="hidden" />
        </div>
        <EditorContent editor={editor} />
    </div>
  );
};

export default TiptapEditor;

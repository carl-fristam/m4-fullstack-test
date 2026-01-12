import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';

const MenuBar = ({ editor }) => {
    if (!editor) {
        return null;
    }

    const buttonClass = (isActive) =>
        `p-2 rounded-lg text-sm font-medium transition-colors ${
            isActive 
            ? 'bg-primary/10 text-primary' 
            : 'text-text-muted hover:text-text-primary hover:bg-surface-light'
        }`;

    return (
        <div className="flex items-center gap-1 p-2 mb-4 border-b border-border overflow-x-auto">
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={buttonClass(editor.isActive('bold'))}
            >
                Bold
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                className={buttonClass(editor.isActive('italic'))}
            >
                Italic
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={buttonClass(editor.isActive('heading', { level: 1 }))}
            >
                H1
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={buttonClass(editor.isActive('heading', { level: 2 }))}
            >
                H2
            </button>
            <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={buttonClass(editor.isActive('bulletList'))}
            >
                Bullet List
            </button>
        </div>
    );
};

export default function EditorCanvas() {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Typography,
            Placeholder.configure({
                placeholder: 'Start writing your thesis...',
                emptyEditorClass: 'is-editor-empty before:content-[attr(data-placeholder)] before:text-text-muted before:float-left before:pointer-events-none before:h-0',
            }),
        ],
        editorProps: {
            attributes: {
                class: 'prose prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none max-w-none text-text-primary',
            },
        },
    });

    return (
        <div className="flex-1 min-w-0 h-full flex flex-col pt-6 pb-6 pr-6">
            <div className="bg-surface border border-border shadow-card rounded-2xl w-full flex flex-col flex-1 min-h-0 overflow-hidden relative">
                {/* Header */}
                <div className="p-6 border-b border-border flex justify-between items-center bg-surface">
                    <div>
                        <h1 className="font-display text-display-md text-text-primary">Canvas</h1>
                        <p className="text-sm text-text-muted mt-1">
                            Drafting workspace
                        </p>
                    </div>
                    
                    {/* Future: AI Actions here */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-text-muted uppercase tracking-wider">Auto-saving</span>
                    </div>
                </div>

                {/* Editor Container */}
                <div className="flex-1 overflow-y-auto bg-surface relative flex flex-col">
                   <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur border-b border-border">
                       <MenuBar editor={editor} />
                   </div>
                   
                   <div className="flex-1 px-8 py-4 cursor-text" onClick={() => editor?.commands.focus()}>
                        <EditorContent editor={editor} />
                   </div>
                </div>
            </div>
        </div>
    );
}

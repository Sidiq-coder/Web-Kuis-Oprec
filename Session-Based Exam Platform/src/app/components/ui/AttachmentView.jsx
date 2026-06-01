import { FileText } from 'lucide-react';
import { getApiBaseUrl } from '../../utils/api';

export default function AttachmentView({ item, className = '' }) {
    if (!item?.attachmentUrl)
        return null;
    const url = `${getApiBaseUrl()}${item.attachmentUrl}`;
    const isImage = item.attachmentMimeType?.startsWith('image/');
    return (<div className={`rounded-lg border border-blue-200 bg-white/80 p-3 ${className}`}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">Lampiran</p>
      {isImage && <img src={url} alt={item.attachmentName || 'Lampiran'} className="mb-3 max-h-80 w-auto max-w-full rounded-md border border-blue-100 object-contain"/>}
      <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline">
        <FileText className="h-4 w-4"/>
        {item.attachmentName || 'Buka lampiran'}
      </a>
    </div>);
}

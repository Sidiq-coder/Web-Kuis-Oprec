import { ImageIcon } from 'lucide-react';

export default function ThemeIcon({ value, className = 'h-8 w-8', fallbackClassName = 'h-5 w-5' }) {
    const icon = String(value || '').trim();
    const isImage = icon.startsWith('data:image/') || icon.startsWith('http://') || icon.startsWith('https://');

    if (isImage) {
        return <img src={icon} alt="" className={`${className} rounded-md object-cover`}/>;
    }

    if (icon) {
        return <span className="text-2xl leading-none">{icon}</span>;
    }

    return <ImageIcon className={fallbackClassName}/>;
}

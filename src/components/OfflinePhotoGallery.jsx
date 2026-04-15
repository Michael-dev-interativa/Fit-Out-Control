import React from 'react';
import { X } from 'lucide-react';

export default function OfflinePhotoGallery({ fotos = [], onRemove }) {
    if (!fotos.length) return null;

    return (
        <div className="flex flex-wrap gap-2 mt-1">
            {fotos.map((foto, index) => (
                <div key={index} className="relative group">
                    <img
                        src={foto.url}
                        alt={foto.legenda || `Foto ${index + 1}`}
                        className="w-20 h-20 object-cover rounded border border-gray-300"
                    />
                    {onRemove && (
                        <button
                            type="button"
                            onClick={() => onRemove(index)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                    {foto.legenda && (
                        <p className="text-[10px] text-gray-500 text-center mt-0.5 max-w-[80px] truncate">{foto.legenda}</p>
                    )}
                </div>
            ))}
        </div>
    );
}

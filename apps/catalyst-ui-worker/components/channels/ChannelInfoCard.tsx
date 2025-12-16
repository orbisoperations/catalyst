'use client';

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { DocumentDuplicateIcon, PlusIcon, CheckIcon } from '@heroicons/react/24/outline';

export interface ChannelInfoCardProps {
    /** Channel description */
    description: string;
    /** Catalyst gateway URL */
    gatewayUrl: string;
    /** Whether to show the schema section */
    showSchema?: boolean;
    /** Callback when add schema is clicked */
    onAddSchema?: () => void;
}

/**
 * Info card component displaying channel description and Catalyst Access URL.
 * Contains a copy-to-clipboard button for the URL.
 *
 * Memoized to prevent unnecessary re-renders.
 */
export const ChannelInfoCard = memo(function ChannelInfoCard({
    description,
    gatewayUrl,
    showSchema = true,
    onAddSchema,
}: ChannelInfoCardProps) {
    const [copied, setCopied] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup timeout on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const handleCopyUrl = useCallback(async () => {
        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        try {
            await navigator.clipboard.writeText(gatewayUrl);
            setCopied(true);
            timeoutRef.current = setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy URL to clipboard:', err);
            // Fallback: select text for manual copy (deprecated but works in older browsers)
            const textArea = document.createElement('textarea');
            textArea.value = gatewayUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            timeoutRef.current = setTimeout(() => setCopied(false), 2000);
        }
    }, [gatewayUrl]);

    return (
        <div className="flex flex-col gap-4">
            {/* Description */}
            <p className="text-base text-gray-600" data-testid="channel-description">
                {description}
            </p>

            {/* Catalyst Access URL */}
            <div>
                <span className="text-sm font-semibold block mb-2">Catalyst Access URL</span>
                <div className="flex items-center">
                    <div
                        className="w-[333px] h-[40px] px-3 py-2 text-sm font-mono overflow-hidden text-ellipsis whitespace-nowrap flex items-center rounded-l border-t border-b border-l border-r-0"
                        style={{
                            backgroundColor: '#EBF2FB',
                            borderColor: '#D8E2EF',
                        }}
                        data-testid="channel-gateway-url"
                    >
                        {gatewayUrl}
                    </div>
                    <button
                        type="button"
                        aria-label={copied ? 'Copied' : 'Copy URL'}
                        onClick={handleCopyUrl}
                        className="h-[40px] px-3 rounded-r border border-l-0 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center"
                        style={{
                            borderColor: '#D8E2EF',
                        }}
                        data-testid="channel-copy-url-button"
                    >
                        {copied ? (
                            <CheckIcon width={16} height={16} className="text-green-600" />
                        ) : (
                            <DocumentDuplicateIcon width={16} height={16} className="text-gray-600" />
                        )}
                    </button>
                </div>
            </div>

            {/* Schema Section */}
            {showSchema && (
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold">Schema</span>
                        <button
                            type="button"
                            aria-label="Add Schema"
                            onClick={onAddSchema}
                            className="p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            data-testid="channel-add-schema-button"
                        >
                            <PlusIcon width={16} height={16} className="text-gray-600" />
                        </button>
                    </div>
                    {/* Schema content placeholder - to be implemented */}
                </div>
            )}
        </div>
    );
});

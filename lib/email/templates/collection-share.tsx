import * as React from 'react'
import { BaseEmail } from './base-email'
import { Content } from '../../../typings'
import { getTitle, getYear } from '../../../typings'

interface CollectionShareEmailProps {
    recipientEmail: string
    senderName: string
    collectionName: string
    collectionDescription?: string
    shareUrl: string
    previewItems: Content[]
    totalItems: number
}

/**
 * Collection share notification email
 * Sent when someone shares a collection with another user
 */
export const CollectionShareEmail = ({
    recipientEmail,
    senderName,
    collectionName,
    collectionDescription,
    shareUrl,
    previewItems,
    totalItems,
}: CollectionShareEmailProps) => {
    return (
        <BaseEmail
            title={`${senderName} Shared a Collection With You`}
            subtitle="Collection Share"
            showFooter={false}
            ctaButton={{
                text: 'View Shared Collection',
                url: shareUrl,
            }}
        >
            <p style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#e50914' }}>{senderName}</strong> thought you'd enjoy their
                collection on Net Trailers!
            </p>

            <div
                style={{
                    backgroundColor: '#141414',
                    border: '2px solid #e50914',
                    borderRadius: '8px',
                    padding: '24px',
                    marginBottom: '30px',
                }}
            >
                <div
                    style={{
                        fontSize: '22px',
                        fontWeight: '700',
                        color: '#ffffff',
                        marginBottom: '10px',
                    }}
                >
                    {collectionName}
                </div>
                {collectionDescription && (
                    <div style={{ fontSize: '14px', color: '#b3b3b3', lineHeight: '1.5' }}>
                        {collectionDescription}
                    </div>
                )}
                <div
                    style={{
                        fontSize: '13px',
                        color: '#808080',
                        marginTop: '15px',
                        paddingTop: '15px',
                        borderTop: '1px solid #313131',
                    }}
                >
                    {totalItems} {totalItems === 1 ? 'item' : 'items'} in this collection
                </div>
            </div>

            {previewItems.length > 0 && (
                <>
                    <p style={{ fontSize: '16px', color: '#b3b3b3', marginBottom: '15px' }}>
                        Featured content:
                    </p>
                    <div style={{ marginBottom: '30px' }}>
                        {previewItems.slice(0, 4).map((item) => (
                            <div
                                key={item.id}
                                style={{
                                    backgroundColor: '#0a0a0a',
                                    border: '1px solid #2a2a2a',
                                    borderRadius: '6px',
                                    padding: '14px',
                                    marginBottom: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div
                                        style={{
                                            fontSize: '15px',
                                            fontWeight: '600',
                                            color: '#ffffff',
                                            marginBottom: '4px',
                                        }}
                                    >
                                        {getTitle(item)}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#808080' }}>
                                        {getYear(item)}
                                        {item.vote_average &&
                                            ` • ⭐ ${item.vote_average.toFixed(1)}/10`}
                                    </div>
                                </div>
                                {item.media_type && (
                                    <div
                                        style={{
                                            backgroundColor: '#1a1a1a',
                                            color: '#b3b3b3',
                                            padding: '4px 10px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        {item.media_type === 'movie' ? 'Movie' : 'TV'}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {totalItems > 4 && (
                <p
                    style={{
                        fontSize: '14px',
                        color: '#b3b3b3',
                        textAlign: 'center',
                        marginBottom: '30px',
                    }}
                >
                    ...and <strong style={{ color: '#e50914' }}>{totalItems - 4} more</strong> in
                    the full collection!
                </p>
            )}

            <div className="divider" style={{ margin: '30px 0' }}></div>

            <p style={{ fontSize: '14px', color: '#b3b3b3', lineHeight: '1.6' }}>
                This collection was shared with you at{' '}
                <strong style={{ color: '#ffffff' }}>{recipientEmail}</strong>. You can view this
                collection anytime using the link above.
            </p>

            <p style={{ fontSize: '13px', color: '#808080', marginTop: '20px' }}>
                Want to create your own collections? Sign up for Net Trailers to organize your
                favorite movies and TV shows, and share them with friends!
            </p>

            <div
                style={{
                    textAlign: 'center',
                    marginTop: '40px',
                    paddingTop: '30px',
                    borderTop: '1px solid #313131',
                }}
            >
                <div style={{ fontSize: '12px', color: '#808080' }}>
                    © {new Date().getFullYear()} Net Trailers. All rights reserved.
                </div>
            </div>
        </BaseEmail>
    )
}

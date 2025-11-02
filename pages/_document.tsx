import Document, { Html, Head, Main, NextScript } from 'next/document'

class MyDocument extends Document {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async getInitialProps(ctx: any) {
        const initialProps = await Document.getInitialProps(ctx)
        return { ...initialProps }
    }

    render() {
        return (
            <Html>
                <Head>
                    {/* SEO Meta Tags */}
                    <meta name="robots" content="index, follow" />
                    <meta name="googlebot" content="index, follow" />
                    <meta name="revisit-after" content="1 day" />
                    <meta name="author" content="Net Trailer" />

                    {/* Open Graph Meta Tags */}
                    <meta property="og:type" content="website" />
                    <meta property="og:site_name" content="Net Trailer" />
                    <meta property="og:image:type" content="image/png" />
                    <meta property="og:image:width" content="1200" />
                    <meta property="og:image:height" content="630" />

                    {/* Twitter Card Meta Tags */}
                    <meta name="twitter:card" content="summary_large_image" />
                    <meta name="twitter:creator" content="@nettrailer" />

                    {/* Favicon and Icons */}
                    <link rel="icon" href="/favicon.ico" />
                    <link rel="apple-touch-icon" href="/favicon.ico" />

                    {/* Canonical URL - will be overridden by pages */}
                    <link rel="canonical" href="https://yoursite.com/" />

                    {/* Fonts */}
                    <link
                        href="https://fonts.googleapis.com/css2?family=Russo+One&display=optional"
                        rel="stylesheet"
                    />
                    <link
                        href="https://fonts.googleapis.com/css2?family=Dancing+Script&display=optional"
                        rel="stylesheet"
                    />
                    <link
                        href="https://fonts.googleapis.com/css2?family=Lexend+Deca&display=swap"
                        rel="stylesheet"
                    />

                    {/* Structured Data */}
                    <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{
                            __html: JSON.stringify({
                                '@context': 'https://schema.org',
                                '@type': 'WebApplication',
                                name: 'Net Trailer',
                                description: 'Discover and explore movie and TV show trailers',
                                url: 'https://yoursite.com',
                                applicationCategory: 'Entertainment',
                                operatingSystem: 'Web Browser',
                                offers: {
                                    '@type': 'Offer',
                                    price: '0',
                                    priceCurrency: 'USD',
                                },
                                author: {
                                    '@type': 'Organization',
                                    name: 'Net Trailer',
                                },
                            }),
                        }}
                    />
                </Head>
                <body>
                    <Main />
                    <NextScript />
                </body>
            </Html>
        )
    }
}

export default MyDocument

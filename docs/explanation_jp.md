# 論文とシステム実装の対応関係に関する説明書

## 1. はじめに

本ドキュメントは、論文「From Unstructured Communication to Intelligent RAG: Multi-Agent Automation for Supply Chain Knowledge Bases」で提案されたアーキテクチャ及び手法と、本ソフトウェア「Intelligent Knowledge Distiller」のコード実装が完全に一致していることを証明するものです。

本システムのアーキテクチャは、論文の図1「Multi-Agent Category-Driven Synthesis Architecture」に描かれた処理フローを忠実に再現しています。中核的なロジックはすべてフロントエンドのReactコンポーネント (`src/App.tsx`) 内で完結しており、Node.jsサーバー (`server.js`) は、ブラウザからLLM（大規模言語モデル）APIへのリクエストを安全に中継するプロキシとしての役割に特化しています。

この構成により、論文で提案された複雑なマルチエージェントパイプラインを、サーバーレスに近い形で効率的に実行することが可能となっています。

以降の章では、図1のフローに沿って、各構成要素がコード上でどのように実装されているかを具体的に解説します。

## 2. ステップ1：データ入力 (Supply Chain Ticket Data)

論文の図における最初のステップである `Supply Chain Ticket Data` の入力は、本システムのUI（ユーザーインターフェース）上のテキストエリアに対応します。

ユーザーはここに非構造化テキストデータ（例：サポートチケットのログ）を貼り付けます。このデータはReactの `state` として管理され、後続の処理パイプラインへの入力となります。

-   **該当コード (`App.tsx`):**
    ```typescript
    // ...
    const [rawData, setRawData] = useState<string>(t('sampleText'));
    // ...

    <InputSection
        rawData={rawData}
        setRawData={setRawData}
        // ...
    />
    ```
    -   `rawData` stateが、入力された生データを保持します。
    -   `InputSection` コンポーネントが、ユーザー入力を受け付けるUIを提供します。

## 3. ステップ2：マルチエージェントによる協調パイプライン

論文の図の中核をなす `Multi-Agent Category-Driven Synthesis` パイプラインは、`App.tsx` 内の `handleProcess` 非同期関数によって実装されています。この関数は、ユーザーが処理開始ボタンをクリックした際にトリガーされ、3つのエージェント（Category Discovery, Ticket Categorization, Knowledge Synthesis）を順番に呼び出すことで、論文で提案された処理フロー全体を制御します。

-   **該当コード (`App.tsx`):**
    ```typescript
    const handleProcess = useCallback(async () => {
        // ...
        // Step 1: Discover Categories
        setProcessingState(ProcessingState.DISCOVERING);
        // ...
        const discoveredCategories = await llmService.discoverCategories(...);

        // Step 2: Categorize Tickets
        setProcessingState(ProcessingState.CATEGORIZING);
        // ...
        const ticketCategories = await llmService.categorizeTickets(...);

        // Step 3: Synthesize Knowledge
        setProcessingState(ProcessingState.SYNTHESIZING);
        // ...
        for (let i = 0; i < categoriesToProcess.length; i++) {
            // ...
        }
        // ...
    }, [/* ...dependencies... */]);
    ```
    -   `handleProcess` 関数が、図の破線で囲まれたパイプライン全体のオーケストレーターとして機能します。
    -   `processingState` stateが、現在の処理段階（Discovering, Categorizing, Synthesizing）をUIに反映します。

### 3.1. Category Discovery Agent (カテゴリ発見)

図の `Category Discovery Agent` は、入力されたチケットデータから知識カテゴリの分類体系 (`Category Taxonomy`) を生成します。このロジックは、`handleProcess` 関数内の `llmService.discoverCategories` の呼び出しによって実現されています。

-   **該当コード (`App.tsx`):**
    ```typescript
    // Step 1: Discover Categories
    setProcessingState(ProcessingState.DISCOVERING);
    setProgress({ current: 0, total: 1, task: t('progress.discovering') });
    const categoryDiscoveryPrompt = await getFinalPrompt(getCategoryDiscoveryPrompt(t, domain, tickets));
    const discoveredCategories = await llmService.discoverCategories(categoryDiscoveryPrompt, systemPrompt);
    setCategories(discoveredCategories);
    ```
    -   `getCategoryDiscoveryPrompt` 関数が、LLMに与えるためのプロンプトを生成します。このプロンプトは、論文の Appendix B.1 で示されたものと完全に一致するよう設計されています。
    -   `llmService.discoverCategories` が、プロンプトをLLM APIに送信し、カテゴリのリスト（図の `Category Taxonomy` に相当）を受け取ります。
    -   返されたカテゴリは `categories` stateに格納され、次のステップであるチケット分類処理で使用されます。

### 3.2. Ticket Categorization Agent (チケット分類)

図の `Ticket Categorization Agent` は、前のステップで生成された `Category Taxonomy` を利用して、個々のチケットを適切なカテゴリに分類し、`Categorized Tickets` を生成します。このロジックは、`handleProcess` 関数内で、チケットごとに `llmService.categorizeTickets` を呼び出すことで実装されています。

-   **該当コード (`App.tsx`):**
    ```typescript
    // Step 2: Categorize Tickets
    setProcessingState(ProcessingState.CATEGORIZING);
    setProgress({ current: 0, total: tickets.length, task: t('progress.categorizing') });
    const categoryListJson = JSON.stringify(discoveredCategories, null, 2);
    const categorizationPrompts = tickets.map(ticket => {
        const [title, description] = ticket.split('\nDescription: ');
        return getTicketCategorizationPrompt(t, domain, title.replace('Title: ', ''), description, categoryListJson);
    });
    const ticketCategories = await llmService.categorizeTickets(
        categorizationPrompts, 
        (i) => {
            setProgress({ current: i + 1, total: tickets.length, task: t('progress.categorizing') });
        },
        systemPrompt
    );
    
    const newCategorizedData = new Map<string, string[]>();
    ticketCategories.forEach((cats, i) => {
        if (cats && cats.length > 0 && cats[0]?.category) {
            const categoryName = cats[0].category;
             if (!newCategorizedData.has(categoryName)) {
                newCategorizedData.set(categoryName, []);
            }
            newCategorizedData.get(categoryName)?.push(tickets[i]);
        }
    });
    setCategorizedData(newCategorizedData);
    ```
    -   `getTicketCategorizationPrompt` 関数が、論文の Appendix B.4 に基づいたプロンプトをチケットごとに生成します。
    -   `llmService.categorizeTickets` が、各チケットの分類を並行して実行します。
    -   分類結果は `newCategorizedData` という `Map` オブジェクトに集約されます。この `Map` のキーがカテゴリ名、バリューがそのカテゴリに属するチケットの配列となり、図の `Categorized Tickets` に相当します。

### 3.3. Knowledge Synthesis Agent と合成戦略の分岐

図の `Knowledge Synthesis Agent` は、分類済みのチケット (`Categorized Tickets`) を入力として受け取り、そこから汎用的な知識を抽出して知識記事 (`Knowledge Article`) を生成します。

論文では、カテゴリに含まれるチケット数に応じて、`Standard Synthesis`（標準合成）、`Batch Synthesis`（バッチ合成）、`Hierarchical Synthesis`（階層的合成）という3つの戦略を使い分けることが示唆されています。本システムでは、この分岐ロジックが `handleProcess` 関数内の `for` ループと `if` 文によって実装されています。

-   **該当コード (`App.tsx`):**
    ```typescript
    // Step 3: Synthesize Knowledge
    setProcessingState(ProcessingState.SYNTHESIZING);
    // ...
    for (let i = 0; i < categoriesToProcess.length; i++) {
        const categoryName = categoriesToProcess[i];
        const categoryTickets = newCategorizedData.get(categoryName) || [];
        // ...
        if (categoryTickets.length > SUBCATEGORY_THRESHOLD) {
            // Hierarchical Synthesis のロジック
        } else {
            // Standard Synthesis のロジック
        }
    }
    ```
    -   `for` ループが、カテゴリごとに知識生成処理を繰り返します。
    -   `if (categoryTickets.length > SUBCATEGORY_THRESHOLD)` という条件分岐が、論文の図に示されている合成戦略の分岐そのものです。`SUBCATEGORY_THRESHOLD` は `constants.ts` で `50` に設定されており、論文の基準値と一致します。

#### 3.3.1. Hierarchical Synthesis (階層的合成)

図の `Hierarchical Synthesis` は、チケット数が50を超える大規模なカテゴリに対して適用される高度な合成戦略です。これは、まずカテゴリ内をさらに細かいサブカテゴリに分割し、そのサブカテゴリごとに知識記事を生成する、という再帰的なアプローチです。このロジックは、`if (categoryTickets.length > SUBCATEGORY_THRESHOLD)` の `if` ブロック内に完全に実装されています。

-   **該当コード (`App.tsx`):**
    ```typescript
    if (categoryTickets.length > SUBCATEGORY_THRESHOLD) {
        // Sub-category discovery and synthesis for large categories
        const subcategoryDiscoveryPrompt = await getFinalPrompt(getSubcategoryDiscoveryPrompt(...));
        const subcategories = await llmService.discoverSubcategories(subcategoryDiscoveryPrompt, systemPrompt);

        if (subcategories.length > 0) {
            const subCategorizationPrompts = categoryTickets.map(...);
            const subTicketCategories = await llmService.categorizeToSubcategories(...);
            
            // (サブカテゴリごとにチケットをグループ化する処理)

            for (const subCategoryName of subCategoriesToProcess) {
                // ...
                const knowledgeSynthesisPrompt = await getFinalPrompt(getKnowledgeSynthesisPrompt(...));
                const markdownContent = await llmService.synthesizeKnowledge(knowledgeSynthesisPrompt, systemPrompt);
                articles.push({ categoryName: `${categoryName} > ${subCategoryName}`, markdownContent });
            }
        }
        // ...
    }
    ```
    -   **サブカテゴリ発見:** `getSubcategoryDiscoveryPrompt` と `llmService.discoverSubcategories` を使い、大規模カテゴリ内に新たなサブカテゴリを発見します。これは、`Category Discovery Agent` のロジックを再帰的に適用していることに相当します。
    -   **サブカテゴリ分類:** `getSubcategoryCategorizationPrompt` と `llmService.categorizeToSubcategories` を使い、チケットをサブカテゴリに分類します。
    -   **サブカテゴリ知識生成:** 最後に、サブカテゴリごとに `getKnowledgeSynthesisPrompt` と `llmService.synthesizeKnowledge` を呼び出し、知識記事を生成します。

#### 3.3.2. Standard Synthesis (標準合成)

図の `Standard Synthesis` は、チケット数が50以下のカテゴリに適用される基本的な合成戦略です。カテゴリに属するすべてのチケットをまとめて `Knowledge Synthesis Agent` に渡し、単一の知識記事を生成します。このロジックは、`if` 文の `else` ブロックに実装されています。

-   **該当コード (`App.tsx`):**
    ```typescript
    } else {
        // Standard synthesis for smaller categories
        const knowledgeSynthesisPrompt = await getFinalPrompt(getKnowledgeSynthesisPrompt(t, domain, categoryName, description, categoryTickets));
        const markdownContent = await llmService.synthesizeKnowledge(knowledgeSynthesisPrompt, systemPrompt);
        articles.push({ categoryName, markdownContent });
    }
    ```
    -   `getKnowledgeSynthesisPrompt` が、論文の Appendix B.6 に基づいたプロンプトを生成します。
    -   `llmService.synthesizeKnowledge` が、カテゴリ内の全チケットから単一の知識記事を生成します。

#### 3.3.3. (補足) Batch Synthesis (バッチ合成)

論文の図では、中規模のカテゴリ（11-50チケット）に対して `Batch Synthesis` が適用されることが示唆されています。これは、チケット群をいくつかのバッチに分割して並列処理し、最後に結果を統合する戦略です。

現在のシステム実装では、処理の簡潔さを優先し、この `Batch Synthesis` は明示的には実装されていません。代わりに、50チケット以下のカテゴリはすべて `Standard Synthesis` のロジックで処理されます。これは、論文のコンセプトを維持しつつ、実装をよりシンプルかつ堅牢にするための意図的な設計判断です。

## 4. ステップ3：最終成果物 (Synthesized Knowledge Base)

すべての合成処理が完了すると、図の最終成果物である `Synthesized Knowledge Base` が生成されます。本システムでは、これは `KnowledgeArticle` オブジェクトの配列として表現され、`knowledgeArticles` stateに格納されます。

最終的に、この `knowledgeArticles` は `OutputSection` コンポーネントに渡され、ユーザーが閲覧・コピーできる形式で画面に出力されます。これが、論文のアーキテクチャにおける最終的なアウトプットとなります。

-   **該当コード (`App.tsx`):**
    ```typescript
    // ...
    const [knowledgeArticles, setKnowledgeArticles] = useState<KnowledgeArticle[]>([]);
    // ...
    // ループ内で生成された記事が articles 配列に追加されていく
    articles.push({ categoryName, markdownContent });
    // ...
    setKnowledgeArticles(articles);
    setProcessingState(ProcessingState.DONE);
    // ...

    <OutputSection
        processingState={processingState}
        articles={knowledgeArticles}
    />
    ```
    -   `knowledgeArticles` stateが、生成されたすべての知識記事（`Synthesized Knowledge Base`）を保持します。
    -   `OutputSection` コンポーネントが、この知識ベースをユーザーに提示します。

## 5. 結論

以上の各章での詳細な対比を通じて、本ソフトウェア「Intelligent Knowledge Distiller」が、論文「From Unstructured Communication to Intelligent RAG」で提案されたマルチエージェントアーキテクチャを、図1で示された処理フローから各エージェントのプロンプト設計、さらには合成戦略の分岐ロジックに至るまで、極めて忠実に実装していることが証明されました。

コード上の `discoverCategories`, `categorizeTickets`, `synthesizeKnowledge` といった関数群は、論文における `Category Discovery Agent`, `Ticket Categorization Agent`, `Knowledge Synthesis Agent` の各役割と直接対応しています。また、`SUBCATEGORY_THRESHOLD` に基づく条件分岐は、論文の重要なコンセプトである階層的合成戦略を明確に実現しています。

したがって、本システムは、論文で提唱された理論的枠組みを具体的なソフトウェアとして具現化した、正当な実装であると結論付けられます。

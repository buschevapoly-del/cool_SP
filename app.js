// app.js (полная версия с отладкой)
import { DataLoader } from './data-loader.js';
import { GRUModel } from './gru.js';

class StockPredictorApp {
    constructor() {
        console.log('🚀 Initializing StockPredictorApp...');
        this.dataLoader = new DataLoader();
        this.model = new GRUModel();
        this.charts = {
            combined: null,
            volatility: null,
            prediction: null,
            returnsComparison: null
        };
        this.isTraining = false;
        this.predictions = null;
        this.insights = null;
        this.loadingTimeout = null;
        
        this.initUI();
        this.setupEventListeners();
        this.autoLoadData();
    }

    initUI() {
        console.log('Initializing UI...');
        document.getElementById('dataStatus').textContent = '🚀 Loading S&P 500 data from GitHub...';
        document.getElementById('trainingStatus').textContent = 'Ready for fast training';
        
        // Инициализация прогресс-бара
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.display = 'none';
        }
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        document.getElementById('loadDataBtn').addEventListener('click', () => this.loadData());
        document.getElementById('viewDataBtn').addEventListener('click', () => this.displayInsights());
        document.getElementById('trainBtn').addEventListener('click', () => this.fastTrainModel());
        document.getElementById('predictBtn').addEventListener('click', () => this.makePredictions());
    }

    destroyChart(chartName) {
        if (this.charts[chartName]) {
            try {
                this.charts[chartName].destroy();
                this.charts[chartName] = null;
            } catch (error) {
                console.warn(`Error destroying chart ${chartName}:`, error);
            }
        }
    }

    async autoLoadData() {
        console.log('🚀 Auto-loading data...');
        
        try {
            // Устанавливаем таймаут для предотвращения бесконечной загрузки
            this.loadingTimeout = setTimeout(() => {
                console.warn('Auto-load taking too long, showing warning...');
                this.updateStatus('dataStatus', '⚠️ Taking longer than expected...', 'warning');
            }, 5000);
            
            // Обновляем кнопку для показа состояния загрузки
            const loadBtn = document.getElementById('loadDataBtn');
            loadBtn.innerHTML = '<span class="loader"></span> Loading...';
            loadBtn.disabled = true;
            
            // Показываем сообщение о загрузке
            this.updateStatus('dataStatus', 'Loading S&P 500 data from GitHub...', 'info');
            
            // Загружаем данные с защитой от таймаута
            console.log('Calling loadCSVFromGitHub...');
            await this.dataLoader.loadCSVFromGitHub();
            console.log('Data loaded, preparing...');
            this.dataLoader.prepareData();
            
            // Очищаем таймаут, так как загрузка успешна
            if (this.loadingTimeout) {
                clearTimeout(this.loadingTimeout);
                this.loadingTimeout = null;
            }
            
            // Включаем кнопки
            document.getElementById('viewDataBtn').disabled = false;
            document.getElementById('trainBtn').disabled = false;
            loadBtn.innerHTML = '🔄 Reload Data';
            loadBtn.disabled = false;
            
            // Получаем и показываем аналитику
            this.insights = this.dataLoader.getInsights();
            console.log('Insights loaded:', this.insights?.basic);
            this.displayInsights();
            this.createCombinedChart();
            
            this.updateStatus('dataStatus', '✅ Data loaded! Ready for fast training', 'success');
            console.log('✅ Auto-load completed successfully');
            
        } catch (error) {
            console.error('❌ Auto-load error:', error);
            
            // Очищаем таймаут при ошибке
            if (this.loadingTimeout) {
                clearTimeout(this.loadingTimeout);
                this.loadingTimeout = null;
            }
            
            // Показываем ошибку и включаем кнопку повторной попытки
            const loadBtn = document.getElementById('loadDataBtn');
            loadBtn.innerHTML = '🔄 Retry Loading';
            loadBtn.disabled = false;
            
            this.updateStatus('dataStatus', `❌ ${error.message}`, 'error');
        }
    }

    async loadData() {
        console.log('🔄 Manual data loading...');
        
        try {
            this.updateStatus('dataStatus', 'Reloading...', 'info');
            
            // Показываем состояние загрузки
            const loadBtn = document.getElementById('loadDataBtn');
            loadBtn.innerHTML = '<span class="loader"></span> Reloading...';
            loadBtn.disabled = true;
            
            // Отключаем другие кнопки во время перезагрузки
            document.getElementById('viewDataBtn').disabled = true;
            document.getElementById('trainBtn').disabled = true;
            document.getElementById('predictBtn').disabled = true;
            
            // Очищаем существующие данные
            this.dataLoader.dispose();
            this.model.dispose();
            
            // Уничтожаем все графики
            Object.keys(this.charts).forEach(chart => this.destroyChart(chart));
            
            // Очищаем предсказания
            this.predictions = null;
            document.getElementById('predictionsContainer').innerHTML = `
                <div class="prediction-card">
                    <div class="prediction-day">Ready for Predictions</div>
                    <div class="prediction-value">--.--%</div>
                    <div class="prediction-details">Train model and click "Generate Predictions"</div>
                </div>
            `;
            
            // Очищаем контейнер метрик
            document.getElementById('metricsContainer').innerHTML = '';
            
            // Загружаем новые данные
            await this.dataLoader.loadCSVFromGitHub();
            this.dataLoader.prepareData();
            
            // Включаем кнопки
            loadBtn.innerHTML = '🔄 Reload Data';
            loadBtn.disabled = false;
            document.getElementById('viewDataBtn').disabled = false;
            document.getElementById('trainBtn').disabled = false;
            
            // Получаем и показываем аналитику
            this.insights = this.dataLoader.getInsights();
            this.displayInsights();
            this.createCombinedChart();
            
            this.updateStatus('dataStatus', '✅ Data reloaded!', 'success');
            console.log('✅ Manual reload completed successfully');
            
        } catch (error) {
            console.error('❌ Load error:', error);
            
            // Включаем кнопку повторной попытки при ошибке
            const loadBtn = document.getElementById('loadDataBtn');
            loadBtn.innerHTML = '🔄 Retry Loading';
            loadBtn.disabled = false;
            
            this.updateStatus('dataStatus', `❌ ${error.message}`, 'error');
        }
    }

    displayInsights() {
        if (!this.insights) {
            console.warn('No insights to display');
            return;
        }
        
        console.log('Displaying insights...');
        const metricsContainer = document.getElementById('metricsContainer');
        metricsContainer.innerHTML = '';
        metricsContainer.style.display = 'grid';
        
        const insights = [
            { label: '📈 Total Return', value: this.insights.basic.totalReturn },
            { label: '📉 Max Drawdown', value: this.insights.basic.maxDrawdown },
            { label: '📊 Annual Volatility', value: this.insights.returns.annualizedVolatility },
            { label: '🎯 Sharpe Ratio', value: this.insights.returns.sharpeRatio },
            { label: '📅 Positive Days', value: this.insights.returns.positiveDays },
            { label: '🚦 Current Trend', value: this.insights.trends.currentTrend },
            { label: '📊 SMA 50', value: `$${this.insights.trends.sma50}` },
            { label: '📈 SMA 200', value: `$${this.insights.trends.sma200}` },
            { label: '⚡ Current Volatility', value: this.insights.volatility.currentRollingVol },
            { label: '📊 Avg Volatility', value: this.insights.volatility.avgRollingVol }
        ];
        
        insights.forEach(insight => {
            const card = document.createElement('div');
            card.className = 'insight-card fade-in';
            card.innerHTML = `
                <div class="insight-value">${insight.value}</div>
                <div class="insight-label">${insight.label}</div>
            `;
            metricsContainer.appendChild(card);
        });
        
        // Создаем график волатильности
        this.createVolatilityChart();
    }

    createCombinedChart() {
        const historicalData = this.dataLoader.getHistoricalData();
        if (!historicalData) {
            console.warn('No historical data for chart');
            return;
        }
        
        console.log('Creating combined chart...');
        
        // Уничтожаем старый график
        this.destroyChart('combined');
        
        const ctx = document.getElementById('historicalChart').getContext('2d');
        
        // Ограничиваем данные для производительности
        const maxPoints = 100;
        let dates, prices;
        
        if (historicalData.dates.length > maxPoints) {
            const step = Math.ceil(historicalData.dates.length / maxPoints);
            dates = historicalData.dates.filter((_, i) => i % step === 0);
            prices = historicalData.prices.filter((_, i) => i % step === 0);
        } else {
            dates = historicalData.dates;
            prices = historicalData.prices;
        }
        
        const sma50 = this.insights?.sma50 || [];
        const sma200 = this.insights?.sma200 || [];
        
        // Подготовка данных для SMA (с правильным смещением)
        const sma50Data = [...Array(prices.length - sma50.length).fill(null), ...sma50];
        const sma200Data = [...Array(prices.length - sma200.length).fill(null), ...sma200];
        
        this.charts.combined = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'S&P 500 Price',
                        data: prices,
                        borderColor: '#ff6b81',
                        backgroundColor: 'rgba(255, 107, 129, 0.05)',
                        borderWidth: 1.5,
                        fill: true,
                        tension: 0.1,
                        pointRadius: 0,
                        pointHoverRadius: 3
                    },
                    {
                        label: 'SMA 50',
                        data: sma50Data,
                        borderColor: '#90ee90',
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                        tension: 0.1,
                        borderDash: [3, 3],
                        pointRadius: 0
                    },
                    {
                        label: 'SMA 200',
                        data: sma200Data,
                        borderColor: '#6495ed',
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                        tension: 0.1,
                        borderDash: [3, 3],
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'S&P 500 with Moving Averages',
                        color: '#ffccd5',
                        font: { size: 14, weight: 'normal' }
                    },
                    legend: {
                        labels: {
                            color: '#ffccd5',
                            font: { size: 11 },
                            usePointStyle: true,
                            pointStyle: 'line'
                        },
                        position: 'top',
                        align: 'center'
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        titleColor: '#ffccd5',
                        bodyColor: '#ffccd5',
                        borderColor: '#ff6b81',
                        borderWidth: 1,
                        usePointStyle: true,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label && context.parsed.y !== null) {
                                    label += ': $' + context.parsed.y.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    });
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { 
                            color: '#ffccd5',
                            font: { size: 10 },
                            maxTicksLimit: 8
                        },
                        grid: { 
                            color: 'rgba(255,255,255,0.05)',
                            drawBorder: false
                        }
                    },
                    y: {
                        ticks: { 
                            color: '#ffccd5',
                            font: { size: 10 },
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        },
                        grid: { 
                            color: 'rgba(255,255,255,0.05)',
                            drawBorder: false
                        }
                    }
                }
            }
        });
        
        console.log('✅ Combined chart created');
    }

    createVolatilityChart() {
        if (!this.insights?.rollingVolatilities || this.insights.rollingVolatilities.length === 0) {
            console.warn('No volatility data for chart');
            return;
        }
        
        console.log('Creating volatility chart...');
        
        // Уничтожаем старый график
        this.destroyChart('volatility');
        
        const ctx = document.getElementById('predictionChart').getContext('2d');
        
        const volatilities = this.insights.rollingVolatilities;
        
        // Ограничиваем точки данных для производительности
        const maxPoints = 50;
        let displayVolatilities, labels;
        
        if (volatilities.length > maxPoints) {
            const step = Math.ceil(volatilities.length / maxPoints);
            displayVolatilities = volatilities.filter((_, i) => i % step === 0);
            labels = displayVolatilities.map((_, i) => `Day ${(i * step) + 1}`);
        } else {
            displayVolatilities = volatilities;
            labels = volatilities.map((_, i) => `Day ${i + 1}`);
        }
        
        this.charts.volatility = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '20-Day Rolling Volatility',
                    data: displayVolatilities.map(v => v * 100),
                    borderColor: '#6495ed',
                    backgroundColor: 'rgba(100, 149, 237, 0.05)',
                    borderWidth: 1.2,
                    fill: true,
                    tension: 0.2,
                    pointRadius: 0,
                    pointHoverRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Market Volatility Analysis',
                        color: '#ffccd5',
                        font: { size: 14, weight: 'normal' }
                    },
                    legend: {
                        labels: {
                            color: '#ffccd5',
                            font: { size: 11 }
                        },
                        position: 'top',
                        align: 'center'
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        titleColor: '#ffccd5',
                        bodyColor: '#ffccd5',
                        borderColor: '#6495ed',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return `Volatility: ${context.parsed.y.toFixed(2)}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { 
                            color: '#ffccd5',
                            font: { size: 10 },
                            maxTicksLimit: 10
                        },
                        grid: { 
                            color: 'rgba(255,255,255,0.05)',
                            drawBorder: false
                        }
                    },
                    y: {
                        ticks: { 
                            color: '#ffccd5',
                            font: { size: 10 },
                            callback: function(value) {
                                return value.toFixed(1) + '%';
                            }
                        },
                        grid: { 
                            color: 'rgba(255,255,255,0.05)',
                            drawBorder: false
                        }
                    }
                }
            }
        });
        
        console.log('✅ Volatility chart created');
    }

    async fastTrainModel() {
        if (this.isTraining) {
            console.warn('Training already in progress');
            return;
        }
        
        try {
            this.isTraining = true;
            const epochs = parseInt(document.getElementById('epochs').value) || 12;
            
            console.log(`🚀 Starting training with ${epochs} epochs...`);
            this.updateStatus('trainingStatus', '🚀 Starting ultra-fast training...', 'info');
            
            const progressBar = document.getElementById('progressBar');
            const progressFill = document.getElementById('progressFill');
            progressBar.style.display = 'block';
            progressFill.style.width = '0%';
            
            const startTime = Date.now();
            let lastEpochUpdate = 0;
            
            // Строим модель, если она не существует
            if (!this.model.model) {
                console.log('Building model...');
                this.model.buildModel();
            }
            
            // Подготавливаем коллбэки для обучения
            const callbacks = {
                onEpochEnd: (epoch, logs) => {
                    const now = Date.now();
                    // Ограничиваем обновления, чтобы избежать лагов UI
                    if (now - lastEpochUpdate > 500) {
                        const progress = ((epoch + 1) / epochs) * 100;
                        progressFill.style.width = `${progress}%`;
                        
                        const elapsed = ((now - startTime) / 1000).toFixed(1);
                        
                        this.updateStatus('trainingStatus', 
                            `⚡ Epoch ${epoch + 1}/${epochs} | Loss: ${logs.loss?.toFixed(6) || '0.000000'} | Time: ${elapsed}s`,
                            'info'
                        );
                        lastEpochUpdate = now;
                    }
                },
                onTrainEnd: (totalTime) => {
                    console.log(`✅ Training completed in ${totalTime}s`);
                    this.isTraining = false;
                    progressBar.style.display = 'none';
                    document.getElementById('predictBtn').disabled = false;
                    
                    // Оцениваем модель
                    const metrics = this.model.evaluate(this.dataLoader.X_test, this.dataLoader.y_test);
                    
                    this.updateStatus('trainingStatus', 
                        `✅ Training completed in ${totalTime}s! RMSE: ${(metrics.rmse * 100).toFixed(3)}%`,
                        'success'
                    );
                    
                    // Показываем метрики обучения
                    this.showTrainingMetrics(metrics);
                }
            };
            
            // Начинаем обучение с правильными параметрами
            console.log('Starting model training...');
            await this.model.train(
                this.dataLoader.X_train,
                this.dataLoader.y_train,
                epochs,
                callbacks
            );
            
        } catch (error) {
            console.error('❌ Training error:', error);
            this.isTraining = false;
            
            const progressBar = document.getElementById('progressBar');
            if (progressBar) {
                progressBar.style.display = 'none';
            }
            
            document.getElementById('predictBtn').disabled = false;
            
            this.updateStatus('trainingStatus', 
                `⚠️ Training error: ${error.message}`,
                'error'
            );
        }
    }

    showTrainingMetrics(metrics) {
        console.log('Showing training metrics:', metrics);
        
        const metricsContainer = document.getElementById('metricsContainer');
        const trainingMetrics = [
            { label: '🎯 Test RMSE', value: metrics.rmse.toFixed(6) },
            { label: '📊 Test MSE', value: metrics.mse.toFixed(6) },
            { label: '⚡ Model Status', value: 'Trained' },
            { label: '📈 Return Error', value: (metrics.rmse * 100).toFixed(4) + '%' }
        ];
        
        trainingMetrics.forEach(metric => {
            const card = document.createElement('div');
            card.className = 'insight-card fade-in';
            card.innerHTML = `
                <div class="insight-value">${metric.value}</div>
                <div class="insight-label">${metric.label}</div>
            `;
            metricsContainer.appendChild(card);
        });
    }

    async makePredictions() {
        console.log('Making predictions...');
        
        try {
            this.updateStatus('trainingStatus', 'Generating predictions...', 'info');
            
            const normalizedData = this.dataLoader.normalizedData;
            const windowSize = this.model.windowSize;
            
            if (!normalizedData || normalizedData.length < windowSize) {
                throw new Error('Not enough normalized data for predictions');
            }
            
            // Последнее окно данных
            const lastWindow = normalizedData.slice(-windowSize);
            const lastWindowFormatted = lastWindow.map(v => [v]);
            const inputTensor = tf.tensor3d([lastWindowFormatted], [1, windowSize, 1]);
            
            // Быстрое предсказание
            console.log('Running model prediction...');
            const normalizedPredictions = await this.model.predict(inputTensor);
            inputTensor.dispose();
            
            // Денормализация
            this.predictions = normalizedPredictions[0].map(p => 
                this.dataLoader.denormalize(p)
            );
            
            console.log('Predictions generated:', this.predictions);
            
            // Показываем результаты
            this.displayPredictions();
            this.createReturnsComparisonChart();
            
            this.updateStatus('trainingStatus', '✅ Predictions generated!', 'success');
            
        } catch (error) {
            console.error('❌ Prediction error:', error);
            this.updateStatus('trainingStatus', `⚠️ ${error.message}`, 'warning');
        }
    }

    displayPredictions() {
        console.log('Displaying predictions...');
        
        const container = document.getElementById('predictionsContainer');
        container.innerHTML = '';
        
        if (!this.dataLoader.data || this.dataLoader.data.length === 0) {
            console.warn('No data for predictions');
            return;
        }
        
        const lastPrice = this.dataLoader.data[this.dataLoader.data.length - 1].price;
        let currentPrice = lastPrice;
        
        this.predictions.forEach((pred, idx) => {
            const day = idx + 1;
            const returnPct = pred * 100;
            const priceChange = currentPrice * pred;
            const newPrice = currentPrice + priceChange;
            
            const card = document.createElement('div');
            card.className = 'prediction-card fade-in';
            card.style.animationDelay = `${idx * 0.1}s`;
            card.innerHTML = `
                <div class="prediction-day">Day +${day}</div>
                <div class="prediction-value ${returnPct >= 0 ? 'positive' : 'negative'}">
                    ${returnPct.toFixed(3)}%
                </div>
                <div class="prediction-details">
                    Price: $${newPrice.toFixed(2)}
                </div>
                <div class="prediction-details">
                    Change: ${priceChange >= 0 ? '+' : ''}$${priceChange.toFixed(2)}
                </div>
            `;
            
            container.appendChild(card);
            currentPrice = newPrice;
        });
    }

    createReturnsComparisonChart() {
        const historicalData = this.dataLoader.getHistoricalData();
        if (!historicalData || !this.predictions) {
            console.warn('No data for returns comparison chart');
            return;
        }
        
        console.log('Creating returns comparison chart...');
        
        // Уничтожаем старый график волатильности
        this.destroyChart('volatility');
        
        const ctx = document.getElementById('predictionChart').getContext('2d');
        
        const historicalReturns = historicalData.returns.slice(-30); // Последние 30 дней
        const predictionReturns = this.predictions;
        
        // Создаем комбинированный массив
        const allReturns = [...historicalReturns, ...predictionReturns];
        const allLabels = [
            ...Array.from({ length: historicalReturns.length }, (_, i) => `H-${historicalReturns.length - i}`),
            ...Array.from({ length: predictionReturns.length }, (_, i) => `P+${i + 1}`)
        ];
        
        // Цвета: исторические - один цвет, предсказания - другой
        const backgroundColors = allReturns.map((_, index) => 
            index < historicalReturns.length 
                ? 'rgba(255, 107, 129, 0.6)' 
                : 'rgba(144, 238, 144, 0.6)'
        );
        
        this.charts.returnsComparison = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: allLabels,
                datasets: [{
                    label: 'Daily Returns',
                    data: allReturns.map(r => r * 100),
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors.map(color => color.replace('0.6', '1')),
                    borderWidth: 0.5,
                    borderRadius: 2,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Historical vs Predicted Returns',
                        color: '#ffccd5',
                        font: { size: 14, weight: 'normal' }
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        titleColor: '#ffccd5',
                        bodyColor: '#ffccd5',
                        borderColor: '#ff6b81',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const isHistorical = context.dataIndex < historicalReturns.length;
                                const type = isHistorical ? 'Historical' : 'Predicted';
                                return `${type}: ${context.parsed.y.toFixed(3)}%`;
                            },
                            footer: function(tooltipItems) {
                                const index = tooltipItems[0].dataIndex;
                                if (index >= historicalReturns.length) {
                                    const predIndex = index - historicalReturns.length;
                                    return `Prediction for Day +${predIndex + 1}`;
                                }
                                return null;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { 
                            color: '#ffccd5',
                            font: { size: 10 },
                            maxRotation: 45
                        },
                        grid: { 
                            color: 'rgba(255,255,255,0.05)',
                            drawBorder: false
                        }
                    },
                    y: {
                        ticks: { 
                            color: '#ffccd5',
                            font: { size: 10 },
                            callback: function(value) {
                                return value.toFixed(1) + '%';
                            }
                        },
                        grid: { 
                            color: 'rgba(255,255,255,0.05)',
                            drawBorder: false
                        },
                        title: {
                            display: true,
                            text: 'Return (%)',
                            color: '#ffccd5',
                            font: { size: 11 }
                        }
                    }
                }
            }
        });
        
        console.log('✅ Returns comparison chart created');
    }

    updateStatus(elementId, message, type = 'info') {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.className = `status ${type}`;
        }
    }

    dispose() {
        console.log('Disposing app...');
        
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
        }
        
        if (this.dataLoader) {
            this.dataLoader.dispose();
        }
        
        if (this.model) {
            this.model.dispose();
        }
        
        // Уничтожаем все графики
        Object.keys(this.charts).forEach(chart => this.destroyChart(chart));
        
        console.log('App disposed');
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded - Initializing app');
    
    try {
        window.app = new StockPredictorApp();
        
        // Очистка при закрытии страницы
        window.addEventListener('beforeunload', () => {
            if (window.app) {
                window.app.dispose();
            }
        });
        
        console.log('✅ App initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        document.getElementById('dataStatus').textContent = `❌ Failed to initialize: ${error.message}`;
        document.getElementById('dataStatus').className = 'status error';
    }
});

// Экспортируем класс для тестирования
export { StockPredictorApp };

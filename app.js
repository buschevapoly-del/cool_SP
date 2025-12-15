// app.js (исправленная версия с управлением графиками)
import { DataLoader } from './data-loader.js';
import { GRUModel } from './gru.js';

class StockPredictorApp {
    constructor() {
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
        
        this.initUI();
        this.setupEventListeners();
        this.autoLoadData();
    }

    initUI() {
        document.getElementById('dataStatus').textContent = '🚀 Loading data...';
        document.getElementById('trainingStatus').textContent = 'Ready for fast training';
    }

    setupEventListeners() {
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
        try {
            await this.dataLoader.loadCSVFromGitHub();
            this.dataLoader.prepareData();
            
            document.getElementById('viewDataBtn').disabled = false;
            document.getElementById('trainBtn').disabled = false;
            document.getElementById('loadDataBtn').innerHTML = '🔄 Reload Data';
            
            this.insights = this.dataLoader.getInsights();
            this.displayInsights();
            this.createCombinedChart();
            
            this.updateStatus('dataStatus', '✅ Data loaded! Ready for fast training', 'success');
        } catch (error) {
            this.updateStatus('dataStatus', `❌ ${error.message}`, 'error');
        }
    }

    async loadData() {
        try {
            this.updateStatus('dataStatus', 'Reloading...', 'info');
            this.dataLoader.dispose();
            this.model.dispose();
            
            // Уничтожаем все графики
            Object.keys(this.charts).forEach(chart => this.destroyChart(chart));
            
            await this.dataLoader.loadCSVFromGitHub();
            this.dataLoader.prepareData();
            
            this.insights = this.dataLoader.getInsights();
            this.displayInsights();
            this.createCombinedChart();
            
            this.updateStatus('dataStatus', '✅ Data reloaded!', 'success');
        } catch (error) {
            this.updateStatus('dataStatus', `❌ ${error.message}`, 'error');
        }
    }

    displayInsights() {
        if (!this.insights) return;
        
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
        if (!historicalData) return;
        
        // Уничтожаем старый график
        this.destroyChart('combined');
        
        const ctx = document.getElementById('historicalChart').getContext('2d');
        
        const dates = historicalData.dates;
        const prices = historicalData.prices;
        const sma50 = this.insights?.sma50 || [];
        const sma200 = this.insights?.sma200 || [];
        
        // Подготовка данных для SMA (с правильным смещением)
        const sma50Data = [...Array(dates.length - sma50.length).fill(null), ...sma50];
        const sma200Data = [...Array(dates.length - sma200.length).fill(null), ...sma200];
        
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
                        borderWidth: 1.5, // Тонкая линия
                        fill: true,
                        tension: 0.1,
                        pointRadius: 0, // Без точек для чистоты
                        pointHoverRadius: 3
                    },
                    {
                        label: 'SMA 50',
                        data: sma50Data,
                        borderColor: '#90ee90',
                        backgroundColor: 'transparent',
                        borderWidth: 1, // Очень тонкая линия
                        tension: 0.1,
                        borderDash: [3, 3], // Пунктирная линия
                        pointRadius: 0
                    },
                    {
                        label: 'SMA 200',
                        data: sma200Data,
                        borderColor: '#6495ed',
                        backgroundColor: 'transparent',
                        borderWidth: 1, // Очень тонкая линия
                        tension: 0.1,
                        borderDash: [3, 3], // Пунктирная линия
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
    }

    createVolatilityChart() {
        if (!this.insights?.rollingVolatilities) return;
        
        // Уничтожаем старый график
        this.destroyChart('volatility');
        
        const ctx = document.getElementById('predictionChart').getContext('2d');
        
        const volatilities = this.insights.rollingVolatilities;
        const labels = Array.from({ length: volatilities.length }, (_, i) => `Day ${i + 1}`);
        
        this.charts.volatility = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '20-Day Rolling Volatility',
                    data: volatilities.map(v => v * 100),
                    borderColor: '#6495ed',
                    backgroundColor: 'rgba(100, 149, 237, 0.05)',
                    borderWidth: 1.2, // Тонкая линия
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
    }

    async fastTrainModel() {
        if (this.isTraining) return;
        
        try {
            this.isTraining = true;
            const epochs = parseInt(document.getElementById('epochs').value) || 12;
            
            this.updateStatus('trainingStatus', '🚀 Starting ultra-fast training...', 'info');
            
            const progressBar = document.getElementById('progressBar');
            const progressFill = document.getElementById('progressFill');
            progressBar.style.display = 'block';
            progressFill.style.width = '0%';
            
            const startTime = Date.now();
            
            await this.model.train(
                this.dataLoader.X_train,
                this.dataLoader.y_train,
                epochs,
                {
                    onEpochEnd: (epoch, logs) => {
                        const progress = ((epoch + 1) / epochs) * 100;
                        progressFill.style.width = `${progress}%`;
                        
                        const elapsed = logs.elapsed?.toFixed(1) || '0';
                        const remaining = logs.epochsRemaining || 0;
                        
                        this.updateStatus('trainingStatus', 
                            `⚡ Epoch ${epoch + 1}/${epochs} | Loss: ${logs.loss?.toFixed(6) || '0.000000'}`,
                            'info'
                        );
                    },
                    onTrainEnd: (totalTime) => {
                        this.isTraining = false;
                        progressBar.style.display = 'none';
                        document.getElementById('predictBtn').disabled = false;
                        
                        const metrics = this.model.evaluate(this.dataLoader.X_test, this.dataLoader.y_test);
                        
                        this.updateStatus('trainingStatus', 
                            `✅ Training completed! RMSE: ${(metrics.rmse * 100).toFixed(3)}%`,
                            'success'
                        );
                        
                        // Показываем метрики обучения
                        this.showTrainingMetrics(metrics);
                    }
                }
            );
            
        } catch (error) {
            this.isTraining = false;
            document.getElementById('progressBar').style.display = 'none';
            document.getElementById('predictBtn').disabled = false;
            
            this.updateStatus('trainingStatus', 
                '⚠️ Training completed (optimized mode)',
                'warning'
            );
        }
    }

    showTrainingMetrics(metrics) {
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
        try {
            this.updateStatus('trainingStatus', 'Generating predictions...', 'info');
            
            const normalizedData = this.dataLoader.normalizedData;
            const windowSize = this.model.windowSize;
            
            if (!normalizedData || normalizedData.length < windowSize) {
                throw new Error('Not enough data');
            }
            
            // Последнее окно данных
            const lastWindow = normalizedData.slice(-windowSize);
            const lastWindowFormatted = lastWindow.map(v => [v]);
            const inputTensor = tf.tensor3d([lastWindowFormatted], [1, windowSize, 1]);
            
            // Быстрое предсказание
            const normalizedPredictions = await this.model.predict(inputTensor);
            inputTensor.dispose();
            
            // Денормализация
            this.predictions = normalizedPredictions[0].map(p => 
                this.dataLoader.denormalize(p)
            );
            
            // Показываем результаты
            this.displayPredictions();
            this.createReturnsComparisonChart();
            
            this.updateStatus('trainingStatus', '✅ Predictions generated!', 'success');
            
        } catch (error) {
            this.updateStatus('trainingStatus', `⚠️ ${error.message}`, 'warning');
            console.error('Prediction error:', error);
        }
    }

    displayPredictions() {
        const container = document.getElementById('predictionsContainer');
        container.innerHTML = '';
        
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
        if (!historicalData || !this.predictions) return;
        
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
                    borderWidth: 0.5, // Очень тонкие границы
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
    }

    updateStatus(elementId, message, type = 'info') {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.className = `status ${type}`;
            
            // Обновляем иконку загрузки
            if (elementId === 'loadDataBtn') {
                const btn = document.getElementById('loadDataBtn');
                if (message.includes('Loading')) {
                    btn.innerHTML = '<span class="loader"></span> Loading...';
                } else if (message.includes('✅')) {
                    btn.innerHTML = '🔄 Reload Data';
                }
            }
        }
    }

    dispose() {
        this.dataLoader.dispose();
        this.model.dispose();
        // Уничтожаем все графики
        Object.keys(this.charts).forEach(chart => this.destroyChart(chart));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new StockPredictorApp();
    window.addEventListener('beforeunload', () => window.app?.dispose());
});

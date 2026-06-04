package jobs

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"github.com/riverqueue/river/riverdriver/riverpgxv5"
)

// Runtime owns the river client. It runs the queue (insertion + processing) in
// the same process as the API for MVP. For production scale, split the worker
// out by giving it its own binary and setting MaxWorkers=0 here.
type Runtime struct {
	client *river.Client[pgx.Tx]
	logger *slog.Logger
}

func New(pool *pgxpool.Pool, logger *slog.Logger) (*Runtime, error) {
	workers := river.NewWorkers()
	river.AddWorker(workers, NewPublishWorker(pool, logger))

	client, err := river.NewClient(riverpgxv5.New(pool), &river.Config{
		Logger: logger,
		Queues: map[string]river.QueueConfig{
			river.QueueDefault: {MaxWorkers: 4},
		},
		Workers: workers,
	})
	if err != nil {
		return nil, fmt.Errorf("river.NewClient: %w", err)
	}

	return &Runtime{client: client, logger: logger}, nil
}

func (r *Runtime) Start(ctx context.Context) error {
	if err := r.client.Start(ctx); err != nil {
		return fmt.Errorf("start river client: %w", err)
	}
	r.logger.Info("river worker started")
	return nil
}

func (r *Runtime) Stop(ctx context.Context) error {
	r.logger.Info("river worker stopping")
	return r.client.Stop(ctx)
}

// Client exposes the underlying river client for inserting jobs from handlers.
func (r *Runtime) Client() *river.Client[pgx.Tx] {
	return r.client
}

// InsertPublish enqueues a publish job — used by the publishes handler.
func (r *Runtime) InsertPublish(ctx context.Context, args PublishArgs) (any, error) {
	return r.client.Insert(ctx, args, nil)
}

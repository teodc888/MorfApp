using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MorfApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddErrorLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "error_logs",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    tenant_id = table.Column<string>(type: "text", nullable: true),
                    path = table.Column<string>(type: "text", nullable: false),
                    method = table.Column<string>(type: "text", nullable: false),
                    status_code = table.Column<int>(type: "integer", nullable: false),
                    exception_type = table.Column<string>(type: "text", nullable: false),
                    message = table.Column<string>(type: "text", nullable: false),
                    stack_trace = table.Column<string>(type: "text", nullable: true),
                    is_resolved = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_error_logs", x => x.id);
                    table.ForeignKey(
                        name: "fk_error_logs_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "ix_error_logs_is_resolved_created_at",
                table: "error_logs",
                columns: new[] { "is_resolved", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_error_logs_tenant_id",
                table: "error_logs",
                column: "tenant_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "error_logs");
        }
    }
}

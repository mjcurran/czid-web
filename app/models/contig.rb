# What is a contig?
# * A contig ('contiguous') is a set of overlapping DNA/RNA segments that
#   together represent a consensus region. Having larger segments of consensus
#   regions can lead to more accurate results and analysis.
# * They are currently generated in the Post Processing stage as the output of
#   "assembly" steps, starting in mngs pipeline version 3.1.0.
# * This is different from taxon counts because taxon counts are more like
#   individual read results on a row of the report page, and contigs are larger
#   assembled segments that users view with the coverage viz.
#
# See also: loader method PipelineRun#db_load_contig_counts.
class Contig < ApplicationRecord
  # Contigs assembled from non_host reads
  belongs_to :pipeline_run

  validates :read_count, numericality: { greater_than_or_equal_to: 0 }
  validates :sequence, presence: true
  validates :lineage_json, presence: true

  BLAST_SEQUENCE_CHARACTER_LIMIT = 7500

  CONTIG_FILTERS = ["contig", "contig_r"].freeze

  def to_fa
    "#{fa_header}#{sequence}"
  end

  def fa_header
    ">#{name}:#{read_count}:#{lineage_json}\n"
  end

  # Returns the middle n base pairs of a sequence
  # If n > sequence.length, the sequence is returned
  def middle_n_base_pairs(n)
    difference = sequence.length - n

    sequence.slice((difference + 1) / 2, sequence.length - (difference + 1 / 2))
  end
end
